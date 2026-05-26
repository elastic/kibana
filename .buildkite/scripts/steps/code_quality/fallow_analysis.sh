#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

# Extract section body for a specific owner from grouped markdown output.
# Flag-based awk (no early exit) avoids SIGPIPE with pipefail.
# Skips the owner header line, prints until next owner section.
extract_owner_section() {
  local output="$1"
  local owner="$2"
  printf '%s\n' "$output" | awk \
    -v owner="## ${owner}" \
    'BEGIN{found=0}
     $0 ~ owner { found=1; next }
     found && /^## @elastic\// { found=0 }
     found { print }'
}

# Extract the count summary for an owner from the single-line summary output.
# Summary line format: "N groups: ... · @elastic/team-name 98 · ..."
extract_count() {
  local summary="$1"
  local owner="$2"
  printf '%s\n' "$summary" | grep -oE "${owner//\//\\/} \([^)]+\)" | sed "s|${owner//\//\\/} ||"
}

echo "--- Install fallow v${FALLOW_VERSION}"
npx --yes "fallow@${FALLOW_VERSION}" --version

echo "--- Run fallow dead-code analysis"
set +e
DEAD_CODE_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dead-code \
  --group-by owner \
  --production \
  --format markdown \
  --quiet \
  2>&1)
DEAD_CODE_EXIT=$?
set -e

echo "--- Run fallow duplication analysis"
set +e
DUPES_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dupes \
  --group-by owner \
  --format markdown \
  --quiet \
  2>&1)
DUPES_EXIT=$?
set -e

echo "--- Extract counts for annotation"
set +e
DEAD_CODE_SUMMARY=$(npx "fallow@${FALLOW_VERSION}" dead-code \
  --group-by owner \
  --production \
  --summary \
  --quiet \
  2>/dev/null)
DUPES_SUMMARY=$(npx "fallow@${FALLOW_VERSION}" dupes \
  --group-by owner \
  --summary \
  --quiet \
  2>/dev/null)
set -e

echo "+++ Results"

ANNOTATION=""
for owner in "${FALLOW_OWNERS[@]}"; do
  dead_section=$(extract_owner_section "$DEAD_CODE_OUTPUT" "$owner")
  dupes_section=$(extract_owner_section "$DUPES_OUTPUT" "$owner")
  dead_count=$(extract_count "$DEAD_CODE_SUMMARY" "$owner")
  dupes_count=$(extract_count "$DUPES_SUMMARY" "$owner")
  team_short="${owner#@elastic/}"

  echo "━━━ ${owner} ━━━"
  echo ""
  if [ -n "$dead_section" ]; then
    echo "Dead code:"
    echo "$dead_section"
  else
    echo "Dead code: no issues"
  fi
  echo ""
  if [ -n "$dupes_section" ]; then
    echo "Duplication:"
    echo "$dupes_section"
  else
    echo "Duplication: no issues"
  fi
  echo ""

  dead_label="${dead_count:-no dead code}"
  dupes_label="${dupes_count:-no duplication}"
  ANNOTATION+="${team_short}: ${dead_label} · ${dupes_label}\n"
done

echo "--- Post Buildkite annotation"

printf "**Code Quality**\n\n%b" "$ANNOTATION" \
  | buildkite-agent annotate --style info --context fallow-report
