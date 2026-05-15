#!/usr/bin/env bash
#
# Builds the dead-code leaderboard for the entire repo.
#
# For every kibana.jsonc package: derive the right entry surface, generate a
# per-package knip.json, run knip, and aggregate results into a sorted
# Markdown table.
#
# Usage:
#   bash .agents/skills/dead-code-cleanup/scripts/scan.sh > dead-code-leaderboard.md
#
# Output: Markdown leaderboard sorted by unused-file count (descending).
# Side effect: leaves a knip.json in each scanned package directory (gitignored
# at the repo root so they stay local).
#
# Requires: node v24+ (for npx knip), python3, perl (timeout shim on macOS).

set +e  # per-package script handles its own errors; xargs may return 123

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

# Make per-package knip.json files gitignored repo-wide (idempotent)
if ! grep -qxF 'knip.json' .gitignore 2>/dev/null; then
  echo "knip.json" >> .gitignore
fi

INDEX=$(mktemp -t kbn-deep-imports.XXXXXX)
RESULTS=$(mktemp -t kbn-scan-results.XXXXXX)
PER_PKG=$(mktemp -t kbn-scan-per-pkg.XXXXXX)
trap "rm -f $INDEX $RESULTS $PER_PKG" EXIT

echo "[$(date +%H:%M:%S)] building deep-import index..." >&2
git ls-files '*.ts' '*.tsx' \
  | xargs grep -hoE "['\"]@kbn/[^'\"]+['\"]" 2>/dev/null \
  | tr -d "\"'" | sort -u > "$INDEX"
echo "[$(date +%H:%M:%S)] indexed $(wc -l < "$INDEX" | tr -d ' ') unique deep-import specs" >&2

cat > "$PER_PKG" <<'PERPKG'
#!/usr/bin/env bash
# Per-package: parse kibana.jsonc, derive entries, run knip, emit TSV row.
# Emits: status<TAB>count<TAB>pkg_id<TAB>owner_csv<TAB>rel_dir<TAB>note
set +e
JSONC_REL="$1"
ROOT="$2"
INDEX="$3"
JSONC="$ROOT/$JSONC_REL"
PKG_DIR="$(dirname "$JSONC")"
REL_DIR="$(dirname "$JSONC_REL")"

PARSED=$(python3 - "$JSONC" <<'PY' 2>/dev/null
import json, re, sys
try:
    raw = open(sys.argv[1], encoding='utf-8').read()
except Exception:
    print("ERR\t\t\tparse-read"); sys.exit(0)
s = re.sub(r'/\*.*?\*/', '', raw, flags=re.S)
s = re.sub(r'(^|[^:])//.*?$', r'\1', s, flags=re.M)
s = re.sub(r',(\s*[}\]])', r'\1', s)
try:
    j = json.loads(s)
except Exception:
    print("ERR\t\t\tparse-json"); sys.exit(0)
pid = j.get('id', '') or ''
owner = j.get('owner', '')
owner_csv = ','.join(owner) if isinstance(owner, list) else (owner or '')
print(f"OK\t{pid}\t{owner_csv}")
PY
)
PSTATUS=$(echo "$PARSED" | head -1 | cut -f1)
if [ "$PSTATUS" != "OK" ]; then
  echo -e "ERR\t0\t\t\t$REL_DIR\tjsonc-parse-failed"
  exit 0
fi
ID=$(echo "$PARSED" | cut -f2)
OWNER=$(echo "$PARSED" | cut -f3)

# Pre-flight: Cypress
if ls "$PKG_DIR"/cypress 2>/dev/null >/dev/null \
   || find "$PKG_DIR" -name "*.cy.ts" -print -quit 2>/dev/null | grep -q .; then
  echo -e "AUTOSKIP\t0\t$ID\t$OWNER\t$REL_DIR\tcypress"
  exit 0
fi

# Pre-flight: dynamic loader detection (annotation only — not a skip)
DYNHIT=0
if grep -rEq 'readdirSync|require\.context|globSync|fast-?glob|globby|path\.resolve.*__dirname.*__fixture' \
     "$PKG_DIR"/{src,server,public,common} 2>/dev/null; then
  DYNHIT=1
fi

# Derive entries: declared kibana.jsonc surfaces + bare-root files
ENTRIES=()
for cand in server/index.ts public/index.ts public/index.tsx common/index.ts \
            index.ts index.tsx src/index.ts src/index.tsx; do
  [ -f "$PKG_DIR/$cand" ] && ENTRIES+=("$cand")
done

# Discover deep-import surfaces from the prebuilt index
if [ -n "$ID" ] && [ -f "$INDEX" ]; then
  DEEP=$(grep -E "^${ID}/" "$INDEX" 2>/dev/null | sed -E "s|^${ID}/||" | sort -u)
  if [ -n "$DEEP" ]; then
    while IFS= read -r sub; do
      [ -z "$sub" ] && continue
      # Try both <sub>.ts/.tsx and <sub>/index.ts/.tsx — list whichever exists
      for cand in "$sub.ts" "$sub.tsx" "$sub/index.ts" "$sub/index.tsx"; do
        if [ -f "$PKG_DIR/$cand" ]; then
          ENTRIES+=("$cand"); break
        fi
      done
    done <<< "$DEEP"
  fi
fi

# Dedupe entries
ENTRIES=($(printf "%s\n" "${ENTRIES[@]}" | awk '!seen[$0]++'))

if [ ${#ENTRIES[@]} -eq 0 ]; then
  echo -e "SKIP\t0\t$ID\t$OWNER\t$REL_DIR\tno-entry"
  exit 0
fi

# Add catch-all entries so test/story/mock files aren't reported as unused
ENTRIES+=("**/*.test.{ts,tsx}")
ENTRIES+=("**/*.stories.{ts,tsx}")
ENTRIES+=("**/__mocks__/**/*.{ts,tsx}")
ENTRIES+=("**/__storybook_mocks__/**/*.{ts,tsx}")
ENTRIES+=("**/*.mock.{ts,tsx}")
ENTRIES+=("**/tsd_tests/test_d/**/*.ts")
[ -d "$PKG_DIR/__jest__" ] && ENTRIES+=("**/__jest__/**/*.{ts,tsx}")

ENTRY_JSON=$(printf '"%s",' "${ENTRIES[@]}")
ENTRY_JSON="[${ENTRY_JSON%,}]"

cat > "$PKG_DIR/knip.json" <<EOF
{
  "\$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": $ENTRY_JSON,
  "project": ["server/**/*.{ts,tsx}", "public/**/*.{ts,tsx}", "common/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "*.{ts,tsx}"],
  "ignore": ["target/**", "**/*.d.ts"]
}
EOF

# knip requires a package.json — stub if missing, clean up after
CREATED_PKG=0
if [ ! -f "$PKG_DIR/package.json" ]; then
  echo '{"name":"_knip_stub","version":"1.0.0"}' > "$PKG_DIR/package.json"
  CREATED_PKG=1
fi

cd "$PKG_DIR" || { echo -e "ERR\t0\t$ID\t$OWNER\t$REL_DIR\tno-cd"; exit 0; }
# 120s timeout via perl (macOS lacks `timeout`)
OUT=$(perl -e 'alarm 120; exec @ARGV' npx --yes knip --no-config-hints 2>/dev/null)
RC=$?

[ $CREATED_PKG -eq 1 ] && rm -f "$PKG_DIR/package.json"

if [ $RC -ge 124 ]; then
  NOTE="knip-timeout"
  [ $DYNHIT -eq 1 ] && NOTE="$NOTE+dynloader"
  echo -e "ERR\t0\t$ID\t$OWNER\t$REL_DIR\t$NOTE"
  exit 0
fi
if [ -z "$OUT" ] && [ $RC -ne 0 ]; then
  echo -e "ERR\t0\t$ID\t$OWNER\t$REL_DIR\tknip-failed"
  exit 0
fi

COUNT=$(echo "$OUT" | grep -oE '^Unused files \([0-9]+\)' | head -1 | grep -oE '[0-9]+')
[ -z "$COUNT" ] && COUNT=0

NOTE=""
[ $DYNHIT -eq 1 ] && NOTE="dynloader"

echo -e "OK\t$COUNT\t$ID\t$OWNER\t$REL_DIR\t$NOTE"
PERPKG
chmod +x "$PER_PKG"

# Walk every kibana.jsonc in parallel
JSONC_FILES=$(git ls-files '*kibana.jsonc')
TOTAL=$(echo "$JSONC_FILES" | wc -l | tr -d ' ')
echo "[$(date +%H:%M:%S)] scanning $TOTAL packages (parallelism: 8)..." >&2

echo "$JSONC_FILES" | xargs -n1 -P 8 -I{} bash -c '"$1" "$2" "$3" "$4"' _ "$PER_PKG" "{}" "$ROOT" "$INDEX" > "$RESULTS"

OK_COUNT=$(awk -F'\t' '$1=="OK"' "$RESULTS" | wc -l | tr -d ' ')
SKIP_COUNT=$(awk -F'\t' '$1=="SKIP"' "$RESULTS" | wc -l | tr -d ' ')
AUTOSKIP_COUNT=$(awk -F'\t' '$1=="AUTOSKIP"' "$RESULTS" | wc -l | tr -d ' ')
ERR_COUNT=$(awk -F'\t' '$1=="ERR"' "$RESULTS" | wc -l | tr -d ' ')
echo "[$(date +%H:%M:%S)] scan done: OK=$OK_COUNT SKIP=$SKIP_COUNT AUTOSKIP=$AUTOSKIP_COUNT ERR=$ERR_COUNT" >&2

# Emit Markdown leaderboard
cat <<MD
# Dead Code Leaderboard

Generated $(date +%Y-%m-%d) by \`.agents/skills/dead-code-cleanup/scripts/scan.sh\`.

## Summary

- Packages scanned OK: $OK_COUNT
- Auto-skipped (Cypress / *.cy.ts): $AUTOSKIP_COUNT
- No-entry skip: $SKIP_COUNT
- Errors: $ERR_COUNT
- Total: $TOTAL

## Top 50 Packages by Unused-File Count

| Rank | Unused | Package | Team | Path | Note |
|---:|---:|---|---|---|---|
MD

# Sort by count desc, take top 50, format as Markdown
awk -F'\t' '$1=="OK" && $2 > 0' "$RESULTS" \
  | sort -t$'\t' -k2,2 -rn \
  | head -50 \
  | awk -F'\t' 'BEGIN{r=0} {r++; printf "| %d | %d%s | `%s` | %s | `%s` | %s |\n", r, $2, ($6=="dynloader"?" (dynloader)":""), $3, $4, $5, $6}'
