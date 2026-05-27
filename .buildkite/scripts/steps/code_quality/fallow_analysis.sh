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

# Extract count summary from the section header line,
# e.g. "## @elastic/search-kibana (18 issues: 5 exports · 13 types)" → "(18 issues: 5 exports · 13 types)"
extract_owner_count() {
  local output="$1"
  local owner="$2"
  local escaped="${owner//\//\\/}"
  printf '%s\n' "$output" | grep -oE "^## ${escaped} \([^)]+\)" | grep -oE '\([^)]+\)' || true
}

echo "--- Install fallow v${FALLOW_VERSION}"
npx --yes "fallow@${FALLOW_VERSION}" --version

echo "--- Run fallow analysis"
echo "Run locally: npx fallow@${FALLOW_VERSION} --group-by owner --production"
set +e
FALLOW_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" \
  --group-by owner \
  --production \
  --format markdown \
  --quiet \
  2>&1)
FALLOW_EXIT=$?
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

echo "--- Post Buildkite annotation"

ANNOTATION="**Code Quality**\n\n"
HAS_ISSUES=0
for owner in "${FALLOW_OWNERS[@]}"; do
  count=$(extract_owner_count "$FALLOW_OUTPUT" "$owner")
  if [ -n "$count" ]; then
    team_short="${owner#@elastic/}"
    ANNOTATION+="- **${team_short}** ${count}\n"
    HAS_ISSUES=1
  fi
done

if [ "$HAS_ISSUES" -eq 0 ]; then
  ANNOTATION+="All teams clean\n"
fi

buildkite-agent annotate --style info --context fallow-report "$(printf "%b" "$ANNOTATION")"
