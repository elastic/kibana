#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

# Extract dead code section body for a specific owner.
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

# Extract count summary from the dead code section header line,
# e.g. "@elastic/workchat-eng (46 issues: 31 exports · 13 types)" → "(46 issues: 31 exports · 13 types)"
extract_owner_count() {
  local output="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  printf '%s\n' "$output" | grep -oE "^${escaped} \([^)]+\)" | grep -oE '\([^)]+\)' || true
}

# Extract per-owner section from the "● Per-owner health" block.
extract_owner_health_section() {
  local output="$1"
  local owner="$2"
  printf '%s\n' "$output" | awk \
    -v owner="${owner}" \
    'BEGIN{in_health=0; found=0}
     /^● Per-owner health/ { in_health=1; next }
     !in_health { next }
     $0 ~ ("^" owner "[ (]") { found=1; next }
     found && /^@elastic\// { found=0 }
     found && /^\(unowned\)/ { found=0 }
     found { print }'
}

# Extract the full "● Per-owner health" block (summary table for all owners).
extract_health_table() {
  local output="$1"
  printf '%s\n' "$output" | awk '/^● Per-owner health/{found=1} found{print}'
}

# Extract grade and score from the "● Per-owner health" table row for an owner.
# Table format: "  @elastic/owner  score  grade  files  hot  p90"
# Returns e.g. "F 9.9"
extract_owner_health_header() {
  local output="$1"
  local owner="$2"
  printf '%s\n' "$output" | awk \
    -v owner="${owner}" \
    '/^● Per-owner health/{in_health=1; next}
     in_health && $1 == owner {
       print $3 " " $2
       exit
     }'
}

# Returns an emoji for a grade letter (A=🟢 B=🟡 C=🟠 D/F=🔴)
grade_emoji() {
  case "${1:0:1}" in
    A) echo "🟢" ;;
    B) echo "🟡" ;;
    C) echo "🟠" ;;
    *)  echo "🔴" ;;
  esac
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
echo "Scope: @elastic/search-kibana and @elastic/workchat-eng (via CODEOWNERS, excludes tests/stories/mocks)"
echo ""
echo "Run locally (same as CI, grouped by team):"
echo "  npx fallow --group-by owner --score"
echo ""
echo "See ALL files for your team (no truncation):"
echo "  search-kibana: npx fallow dead-code --workspace 'x-pack/solutions/search/**'"
echo "  workchat-eng:  npx fallow dead-code --workspace 'src/platform/packages/shared/kbn-connector-specs/**'"
echo ""
echo "See hotspots for your team:"
echo "  search-kibana: npx fallow health --workspace 'x-pack/solutions/search/**'"
echo "  workchat-eng:  npx fallow health --workspace 'src/platform/packages/shared/kbn-connector-specs/**'"
set +e
# shellcheck disable=SC2086
FALLOW_OUTPUT=$(.buildkite/node_modules/.bin/fallow \
  --group-by owner \
  --score \
  --format human \
  --quiet \
  $SAVE_SNAPSHOT_FLAG \
  2>&1)
set -e

echo "--- Per-owner health score"
health_table=$(extract_health_table "$FALLOW_OUTPUT")
if [ -n "$health_table" ]; then
  echo "$health_table"
else
  echo "No health data available"
fi

for owner in "${FALLOW_OWNERS[@]}"; do
  echo "--- ${owner}"
  section=$(extract_owner_section "$FALLOW_OUTPUT" "$owner")
  health=$(extract_owner_health_section "$FALLOW_OUTPUT" "$owner")
  if [ -n "$section" ] || [ -n "$health" ]; then
    [ -n "$section" ] && echo "$section"
    [ -n "$health" ] && echo "$health"
  else
    echo "No issues found"
  fi
done

echo "--- Post Buildkite annotation"

ANNOTATION="**Code Quality**\n\n"
for owner in "${FALLOW_OWNERS[@]}"; do
  count=$(extract_owner_count "$FALLOW_OUTPUT" "$owner")
  health_header=$(extract_owner_health_header "$FALLOW_OUTPUT" "$owner")
  team_short="${owner#@elastic/}"
  line="- **${team_short}**:"
  if [ -n "$count" ]; then
    line+=" dead code ${count}"
  else
    line+=" no dead code"
  fi
  if [ -n "$health_header" ]; then
    grade=$(echo "$health_header" | awk '{print $1}')
    score=$(echo "$health_header" | awk '{print $2}')
    emoji=$(grade_emoji "$grade")
    line+=" · complexity ${emoji} ${grade} (${score}/100)"
  fi
  ANNOTATION+="${line}\n"
done

buildkite-agent annotate --style info --context fallow-report "$(printf "%b" "$ANNOTATION")"

if [ -n "$SAVE_SNAPSHOT_FLAG" ]; then
  echo "--- Save snapshot for next run"
  buildkite-agent artifact upload "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi
