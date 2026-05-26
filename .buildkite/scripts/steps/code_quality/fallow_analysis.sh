#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

# Extract section for a specific owner from grouped fallow output.
# Uses flag-based awk (no early exit) to avoid SIGPIPE with pipefail.
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

echo "+++ Results"

ANNOTATION_PARTS=()
for owner in "${FALLOW_OWNERS[@]}"; do
  dead_section=$(extract_owner_section "$DEAD_CODE_OUTPUT" "$owner")
  dupes_section=$(extract_owner_section "$DUPES_OUTPUT" "$owner")
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

  dead_summary=$(printf '%s\n' "$dead_section" | head -1)
  dupes_summary=$(printf '%s\n' "$dupes_section" | head -1)
  ANNOTATION_PARTS+=("**${team_short}:** ${dead_summary:-no dead code} · ${dupes_summary:-no duplication}")
done

echo "--- Post Buildkite annotation"

ANNOTATION_BODY=""
for part in "${ANNOTATION_PARTS[@]}"; do
  ANNOTATION_BODY+="${part}\n"
done

printf "**Code Quality Report**\n\n%b" "$ANNOTATION_BODY" \
  | buildkite-agent annotate --style info --context fallow-report
