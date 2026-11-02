#!/usr/bin/env bash
# Count server-side TypeScript lines of code in the Kibana repo.
#
# Requires: scc (brew install scc)
#
# Usage:
#   ./scripts/count_server_loc.sh
#   ./scripts/count_server_loc.sh --top 30    # show top N per category (default 20)
#
# Categories counted:
#   - Plugin server/:    the server/ subdirectory of each "type": "plugin" module
#   - shared-server:     the full directory of each "type": "shared-server" module
#   - core:              the full directory of each "type": "core" module
#
# Exclusions:
#   - Directories: node_modules, target, __tests__, __mocks__, __fixtures__, __jest__
#   - Files:       *.test.ts(x), *.spec.ts(x), *.mock.ts, *.stories.tsx
#
# Not counted:
#   - shared-common packages (~534 modules, used on both server and browser)
#   - Plugin common/ directories
#   - shared-browser packages (browser-only)
#   - Test and tooling modules

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Parse --top N
TOP=20
while [[ $# -gt 0 ]]; do
  case "$1" in
    --top) TOP="${2:-20}"; shift 2 ;;
    *)     TOP="$1"; shift ;;
  esac
done

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

SCC_EXCLUDE_DIRS="node_modules,target,__tests__,__mocks__,__fixtures__,__jest__"
SCC_NOT_MATCH='(\.test\.|\.spec\.|\.mock\.|\.stories\.)'

# ── Helpers ──────────────────────────────────────────────────────────────────

find_modules_by_type() {
  local type="$1"
  find "$REPO_ROOT" -name kibana.jsonc -not -path '*/node_modules/*' -print0 \
    | xargs -0 grep -l "\"type\": \"$type\"" 2>/dev/null \
    | while IFS= read -r jsonc; do
        dirname "$jsonc"
      done
}

module_id_from_dir() {
  local dir="$1"
  local jsonc="$dir/kibana.jsonc"
  if [ -f "$jsonc" ]; then
    grep -o '"id": "[^"]*"' "$jsonc" 2>/dev/null \
      | head -1 \
      | sed 's/"id": "//;s/"//' \
      || true
  fi
}

# Run scc on a single directory and emit a tab-separated line:
#   module_id \t code \t comments \t blanks \t total_lines
scc_one_dir() {
  local dir="$1"
  local name="$2"
  local csv
  csv=$(scc --include-ext ts,tsx \
    --exclude-dir "$SCC_EXCLUDE_DIRS" \
    "--not-match=$SCC_NOT_MATCH" \
    --format csv "$dir" 2>/dev/null \
    | grep -i typescript | head -1 || true)
  if [ -n "$csv" ]; then
    # scc csv columns: Language,Lines,Code,Comments,Blanks,Complexity,Bytes,Files
    local code comment blank total
    code=$(echo "$csv" | awk -F, '{print $3}')
    comment=$(echo "$csv" | awk -F, '{print $4}')
    blank=$(echo "$csv" | awk -F, '{print $5}')
    total=$(echo "$csv" | awk -F, '{print $2}')
    printf "%s\t%s\t%s\t%s\t%s\n" "$name" "$code" "$comment" "$blank" "$total"
  fi
}

print_table_header() {
  printf "%-70s %10s %10s %10s %10s\n" "$1" "Code" "Comments" "Blanks" "Total"
  printf '%0.s─' {1..112}; echo
}

print_table_row() {
  printf "%-70s %10s %10s %10s %10s\n" "$1" "$2" "$3" "$4" "$5"
}

# ── 1. Find directories ─────────────────────────────────────────────────────

echo "Scanning for modules..."

plugin_dirs="$TMPDIR/plugin_server_dirs.txt"
find_modules_by_type plugin | while IFS= read -r dir; do
  if [ -d "$dir/server" ]; then
    echo "$dir/server"
  fi
done > "$plugin_dirs"
plugin_count=$(wc -l < "$plugin_dirs" | tr -d ' ')

shared_server_dirs="$TMPDIR/shared_server_dirs.txt"
find_modules_by_type shared-server > "$shared_server_dirs"
shared_server_count=$(wc -l < "$shared_server_dirs" | tr -d ' ')

core_dirs="$TMPDIR/core_dirs.txt"
find_modules_by_type core > "$core_dirs"
core_count=$(wc -l < "$core_dirs" | tr -d ' ')

echo "  Plugins with server/:  $plugin_count"
echo "  shared-server packages: $shared_server_count"
echo "  core modules:           $core_count"
echo ""

# ── 2. Aggregate counts ─────────────────────────────────────────────────────

echo "================================================================"
echo "PLUGIN SERVER DIRECTORIES ($plugin_count plugins)"
echo "================================================================"
# shellcheck disable=SC2046
scc --include-ext ts,tsx \
  --exclude-dir "$SCC_EXCLUDE_DIRS" \
  "--not-match=$SCC_NOT_MATCH" \
  --format wide \
  $(cat "$plugin_dirs")

echo ""
echo "================================================================"
echo "SHARED-SERVER PACKAGES ($shared_server_count packages)"
echo "================================================================"
# shellcheck disable=SC2046
scc --include-ext ts,tsx \
  --exclude-dir "$SCC_EXCLUDE_DIRS" \
  "--not-match=$SCC_NOT_MATCH" \
  --format wide \
  $(cat "$shared_server_dirs")

echo ""
echo "================================================================"
echo "CORE ($core_count module(s))"
echo "================================================================"
# shellcheck disable=SC2046
scc --include-ext ts,tsx \
  --exclude-dir "$SCC_EXCLUDE_DIRS" \
  "--not-match=$SCC_NOT_MATCH" \
  --format wide \
  $(cat "$core_dirs")

# ── 3. Per-module breakdowns ─────────────────────────────────────────────────

echo ""
echo "================================================================"
echo "TOP $TOP PLUGINS BY SERVER CODE LINES"
echo "================================================================"
print_table_header "Plugin"

breakdown="$TMPDIR/plugin_breakdown.tsv"
while IFS= read -r dir; do
  parent="$(dirname "$dir")"
  name=$(module_id_from_dir "$parent")
  if [ -z "$name" ]; then
    name="$(basename "$parent")"
  fi
  scc_one_dir "$dir" "$name"
done < "$plugin_dirs" > "$breakdown"

sort -t$'\t' -k2 -rn "$breakdown" | head -"$TOP" | while IFS=$'\t' read -r name code comment blank total; do
  print_table_row "$name" "$code" "$comment" "$blank" "$total"
done

echo ""
echo "================================================================"
echo "TOP $TOP SHARED-SERVER PACKAGES BY CODE LINES"
echo "================================================================"
print_table_header "Package"

breakdown="$TMPDIR/shared_server_breakdown.tsv"
while IFS= read -r dir; do
  name=$(module_id_from_dir "$dir")
  if [ -z "$name" ]; then
    name="$(basename "$dir")"
  fi
  scc_one_dir "$dir" "$name"
done < "$shared_server_dirs" > "$breakdown"

sort -t$'\t' -k2 -rn "$breakdown" | head -"$TOP" | while IFS=$'\t' read -r name code comment blank total; do
  print_table_row "$name" "$code" "$comment" "$blank" "$total"
done
