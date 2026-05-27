#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

# Extract section body for a specific owner from grouped human output.
# Stops at the next owner section or the health score table.
extract_owner_section() {
  local output="$1"
  local owner="$2"
  printf '%s\n' "$output" | awk \
    -v owner="${owner}" \
    'BEGIN{found=0}
     $0 ~ ("^" owner " ") { found=1; next }
     found && /^@elastic\// { found=0 }
     found && /^\(unowned\)/ { found=0 }
     found && /^● Per-owner health/ { found=0 }
     found { print }'
}

# Extract count summary from the section header line,
# e.g. "@elastic/workchat-eng (46 issues: 31 exports · 13 types)" → "(46 issues: 31 exports · 13 types)"
extract_owner_count() {
  local output="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  printf '%s\n' "$output" | grep -oE "^${escaped} \([^)]+\)" | grep -oE '\([^)]+\)' || true
}

# Extract health score and grade from the score table, e.g. "44.3  D"
extract_owner_score() {
  local output="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  printf '%s\n' "$output" | grep -oE "^[[:space:]]+${escaped}[[:space:]]+[0-9]+\.[0-9]+[[:space:]]+[A-F]" \
    | grep -oE "[0-9]+\.[0-9]+[[:space:]]+[A-F]" | tr -s ' ' || true
}

echo "--- Install fallow v${FALLOW_VERSION}"
npm ci --prefix .buildkite
.buildkite/node_modules/.bin/fallow --version

echo "--- Run fallow analysis"
echo "Run locally: npx fallow@${FALLOW_VERSION} --group-by owner --production --score"
set +e
FALLOW_OUTPUT=$(.buildkite/node_modules/.bin/fallow \
  --group-by owner \
  --production \
  --format human \
  --quiet \
  --score \
  2>&1)
set -e

for owner in "${FALLOW_OWNERS[@]}"; do
  echo "+++ ${owner}"
  section=$(extract_owner_section "$FALLOW_OUTPUT" "$owner")
  if [ -n "$section" ]; then
    echo "$section"
  else
    echo "No issues found"
  fi
done

echo "+++ Health scores"
printf '%s\n' "$FALLOW_OUTPUT" | awk '/^● Per-owner health/,0'

echo "--- Post Buildkite annotation"

ANNOTATION="**Code Quality**\n\n"
HAS_ISSUES=0
for owner in "${FALLOW_OWNERS[@]}"; do
  count=$(extract_owner_count "$FALLOW_OUTPUT" "$owner")
  score=$(extract_owner_score "$FALLOW_OUTPUT" "$owner")
  team_short="${owner#@elastic/}"
  if [ -n "$count" ]; then
    if [ -n "$score" ]; then
      ANNOTATION+="- **${team_short}** ${count} · ${score}\n"
    else
      ANNOTATION+="- **${team_short}** ${count}\n"
    fi
    HAS_ISSUES=1
  elif [ -n "$score" ]; then
    ANNOTATION+="- **${team_short}** no dead code · ${score}\n"
    HAS_ISSUES=1
  fi
done

if [ "$HAS_ISSUES" -eq 0 ]; then
  ANNOTATION+="All teams clean\n"
fi

buildkite-agent annotate --style info --context fallow-report "$(printf "%b" "$ANNOTATION")"
