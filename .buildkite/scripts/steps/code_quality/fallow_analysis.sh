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


echo "--- fallow v${FALLOW_VERSION}"
.buildkite/node_modules/.bin/fallow --version

SNAPSHOT_DIR=".fallow/snapshots"
SNAPSHOT_FILE="fallow-snapshot.json"
SAVE_SNAPSHOT_FLAG=""
if [ "${BUILDKITE_PIPELINE_SLUG:-}" = "kibana-code-quality-fallow" ]; then
  mkdir -p "$SNAPSHOT_DIR"
  SAVE_SNAPSHOT_FLAG="--save-snapshot ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi

echo "--- Run fallow analysis"
echo "Checks: dead code (unused exports/types/files) · duplication · complexity hotspots"
echo "Scope: @elastic/search-kibana and @elastic/workchat-eng (via CODEOWNERS, production files only)"
echo ""
echo "Run locally (same as CI, grouped by team):"
echo "  npx fallow --group-by owner --production"
echo ""
echo "See ALL files for your team (no truncation):"
echo "  search-kibana: npx fallow dead-code --workspace 'x-pack/solutions/search/**' --production"
echo "  workchat-eng:  npx fallow dead-code --workspace 'src/platform/packages/shared/kbn-connector-specs/**' --production"
echo ""
echo "See hotspots for your team:"
echo "  npx fallow health --workspace 'x-pack/solutions/search/**'"
set +e
# shellcheck disable=SC2086
FALLOW_OUTPUT=$(.buildkite/node_modules/.bin/fallow \
  --group-by owner \
  --production \
  --format human \
  --quiet \
  $SAVE_SNAPSHOT_FLAG \
  2>&1)
set -e

echo "--- Dead code"
for owner in "${FALLOW_OWNERS[@]}"; do
  echo "+++ ${owner}"
  section=$(extract_owner_section "$FALLOW_OUTPUT" "$owner")
  if [ -n "$section" ]; then
    echo "$section"
  else
    echo "No issues found"
  fi
done

echo "--- Post Buildkite annotation"

ANNOTATION="**Code Quality** · dead code · duplication\n\n"
for owner in "${FALLOW_OWNERS[@]}"; do
  count=$(extract_owner_count "$FALLOW_OUTPUT" "$owner")
  team_short="${owner#@elastic/}"
  if [ -n "$count" ]; then
    ANNOTATION+="- **${team_short}**: ${count}\n"
  else
    ANNOTATION+="- **${team_short}**: no dead code\n"
  fi
done

buildkite-agent annotate --style info --context fallow-report "$(printf "%b" "$ANNOTATION")"

if [ -n "$SAVE_SNAPSHOT_FLAG" ]; then
  echo "--- Save snapshot for next run"
  buildkite-agent artifact upload "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi
