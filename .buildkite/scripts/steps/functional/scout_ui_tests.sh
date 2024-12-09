#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

echo "--- Running 'discover_enhanced' plugin UI Tests"

TEST_CONFIG="x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts"
KIBANA_DIR="$KIBANA_BUILD_LOCATION"

declare -A TESTS=(
  ["Stateful"]="--stateful"
  ["Serverless Elasticsearch"]="--serverless=es"
  ["Serverless Observability"]="--serverless=oblt"
  ["Serverless Security"]="--serverless=security"
)

EXIT_CODE=0

for TEST_NAME in "${!TESTS[@]}"; do
  echo "--- $TEST_NAME: 'discover_enhanced' plugin UI Tests"
  if ! node scripts/scout run-tests ${TESTS[$TEST_NAME]} --config "$TEST_CONFIG" --kibana-install-dir "$KIBANA_DIR"; then
    echo "--- $TEST_NAME: failed"
    EXIT_CODE=1
  else
    echo "--- $TEST_NAME: passed"
  fi
done

exit $EXIT_CODE
