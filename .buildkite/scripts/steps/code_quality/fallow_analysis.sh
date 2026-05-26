#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

# Extract section body for a specific owner from grouped markdown output.
# Flag-based awk (no early exit) avoids SIGPIPE with pipefail.
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

# Extract the parenthesised summary for an owner, e.g. "(98 issues: 26 files ...)"
# grep returns exit 1 when no match — || true prevents set -e from killing the script.
extract_count() {
  local summary="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  printf '%s\n' "$summary" | grep -oE "${escaped} \([^)]+\)" | sed "s|${escaped} ||" || true
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
for owner in "${FALLOW_OWNERS[@]}"; do
  section=$(extract_owner_section "$DEAD_CODE_OUTPUT" "$owner")
  echo "=== ${owner} ==="
  if [ -n "$section" ]; then
    echo "$section"
  else
    echo "no issues"
  fi
  echo ""
done

echo "--- Run fallow duplication analysis"
set +e
DUPES_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dupes \
  --group-by owner \
  --format markdown \
  --quiet \
  2>&1)
DUPES_EXIT=$?
set -e
for owner in "${FALLOW_OWNERS[@]}"; do
  section=$(extract_owner_section "$DUPES_OUTPUT" "$owner")
  echo "=== ${owner} ==="
  if [ -n "$section" ]; then
    echo "$section"
  else
    echo "no issues"
  fi
  echo ""
done

echo "--- Build annotation"
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

ANNOTATION=""
for owner in "${FALLOW_OWNERS[@]}"; do
  team_short="${owner#@elastic/}"
  dead_count=$(extract_count "$DEAD_CODE_SUMMARY" "$owner")
  dupes_count=$(extract_count "$DUPES_SUMMARY" "$owner")
  dead_label="${dead_count:-no dead code}"
  dupes_label="${dupes_count:-no duplication}"
  ANNOTATION+="${team_short}: ${dead_label} · ${dupes_label}\n"
done

printf "**Code Quality**\n\n%b" "$ANNOTATION" \
  | buildkite-agent annotate --style info --context fallow-report
