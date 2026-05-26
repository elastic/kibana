#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS=("@elastic/search-kibana" "@elastic/workchat-eng")

echo "--- Install fallow v${FALLOW_VERSION}"
npx --yes "fallow@${FALLOW_VERSION}" --version

echo "--- Run fallow dead-code analysis (production, grouped by CODEOWNERS owner)"
set +e
DEAD_CODE_OUTPUT=$(npx "fallow@${FALLOW_VERSION}" dead-code \
  --group-by owner \
  --production \
  --format markdown \
  --quiet \
  2>&1)
DEAD_CODE_EXIT=$?
set -e
echo "Exit code: $DEAD_CODE_EXIT"

echo "--- Extract results for our teams"

extract_owner_section() {
  local output="$1"
  local owner="$2"
  echo "$output" | awk \
    -v owner="## ${owner}" \
    'found && /^## @elastic\// { exit } $0 ~ owner { found=1 } found { print }'
}

REPORT=""
for owner in "${FALLOW_OWNERS[@]}"; do
  dead_section=$(extract_owner_section "$DEAD_CODE_OUTPUT" "$owner")

  if [ -n "$dead_section" ]; then
    REPORT+="### ${owner}\n\n${dead_section}\n\n"
  fi
done

if [ -z "$REPORT" ]; then
  REPORT="No issues found for search-kibana and workchat-eng :tada:"
fi

echo "--- Post Buildkite annotation"

printf "## Fallow Code Quality Report\n\n%b\n\n[Full report in build logs]" "$REPORT" \
  | buildkite-agent annotate --style info --context fallow-report
