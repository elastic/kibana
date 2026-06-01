#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")
SNAPSHOT_FILE="fallow-snapshot.json"
SNAPSHOT_DIR=".fallow/snapshots"

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

# Extract health score, grade and hotspot count from the score table
# e.g. "  @elastic/workchat-eng  52.5  D  108  46  2" → "52.5 D · 46 hotspots"
extract_owner_health() {
  local output="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  local line
  line=$(printf '%s\n' "$output" | grep -oE "^[[:space:]]+${escaped}[[:space:]]+[0-9.]+[[:space:]]+[A-F][[:space:]]+[0-9]+[[:space:]]+[0-9]+" || true)
  if [ -z "$line" ]; then return; fi
  local score grade hotspots
  score=$(printf '%s\n' "$line" | grep -oE "[0-9]+\.[0-9]+" | head -1)
  grade=$(printf '%s\n' "$line" | grep -oE "[A-F]" | head -1)
  hotspots=$(printf '%s\n' "$line" | grep -oE "[0-9]+" | sed -n '4p')
  printf '%s %s · %s hotspots' "$score" "$grade" "$hotspots"
}

echo "--- Install fallow v${FALLOW_VERSION}"
npm ci --prefix .buildkite
.buildkite/node_modules/.bin/fallow --version

# Snapshot: save only from the weekly standalone pipeline, not PR runs.
# Trend comparison will be added once weekly pipeline is running.
IS_WEEKLY_PIPELINE=false
if [ "${BUILDKITE_PIPELINE_SLUG:-}" = "kibana-code-quality-fallow" ]; then
  IS_WEEKLY_PIPELINE=true
fi

SAVE_SNAPSHOT_FLAG=""
if [ "$IS_WEEKLY_PIPELINE" = "true" ]; then
  mkdir -p "$SNAPSHOT_DIR"
  SAVE_SNAPSHOT_FLAG="--save-snapshot ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
  echo "Weekly pipeline — snapshot will be saved after analysis"
fi

echo "--- Run fallow analysis"
echo "Checks: dead code (unused exports/types/files) · duplication · complexity hotspots"
echo "Scope: @elastic/search-kibana and @elastic/workchat-eng (via CODEOWNERS, production files only)"
echo ""
echo "Run locally (same as CI, grouped by team):"
echo "  npx fallow@${FALLOW_VERSION} --group-by owner --production-dead-code --score"
echo ""
echo "See ALL files for your team (no truncation):"
echo "  search-kibana: npx fallow@${FALLOW_VERSION} dead-code --workspace 'x-pack/solutions/search/**' --production"
echo "  workchat-eng:  npx fallow@${FALLOW_VERSION} dead-code --workspace 'src/platform/packages/shared/kbn-connector-specs/**' --production"
echo ""
echo "See hotspots for your team:"
echo "  npx fallow@${FALLOW_VERSION} health --workspace 'x-pack/solutions/search/**'"
set +e
# shellcheck disable=SC2086
FALLOW_OUTPUT=$(.buildkite/node_modules/.bin/fallow \
  --group-by owner \
  --production-dead-code \
  --format human \
  --quiet \
  --score \
  $SAVE_SNAPSHOT_FLAG \
  2>&1)
FALLOW_EXIT=$?
set -e
echo "fallow exit: ${FALLOW_EXIT}, output lines: $(printf '%s\n' "$FALLOW_OUTPUT" | wc -l)"

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

echo "--- Health scores (complexity + maintainability, 0-100)"
echo "Columns: score | grade | files analyzed | hotspots (high complexity + high churn) | p90 cyclomatic"
printf '%s\n' "$FALLOW_OUTPUT" | awk '/^● Per-owner health/,0'

if [ "$IS_WEEKLY_PIPELINE" = "true" ]; then
  echo "--- Save snapshot for next run"
  buildkite-agent artifact upload "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi

echo "--- Post Buildkite annotation"

ANNOTATION="**Code Quality** · dead code · duplication · complexity\n\n"
for owner in "${FALLOW_OWNERS[@]}"; do
  count=$(extract_owner_count "$FALLOW_OUTPUT" "$owner")
  health=$(extract_owner_health "$FALLOW_OUTPUT" "$owner")
  team_short="${owner#@elastic/}"
  if [ -n "$count" ]; then
    dead_str="${count}"
  else
    dead_str="no dead code"
  fi
  if [ -n "$health" ]; then
    ANNOTATION+="- **${team_short}**: ${dead_str} · health ${health}\n"
  else
    ANNOTATION+="- **${team_short}**: ${dead_str}\n"
  fi
done

buildkite-agent annotate --style info --context fallow-report "$(printf "%b" "$ANNOTATION")"
