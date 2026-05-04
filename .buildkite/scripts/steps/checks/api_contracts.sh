#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check API Contracts

export OASDIFF_BIN="${OASDIFF_BIN:-oasdiff}"

BASE_BRANCH="${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-main}"
MERGE_BASE_ARGS=()
if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
  MERGE_BASE_ARGS=(--mergeBase "$GITHUB_PR_MERGE_BASE")
fi

REPORT_DIR="packages/kbn-api-contracts/target/reports"
STACK_REPORT="$REPORT_DIR/stack-impact.json"
SERVERLESS_REPORT="$REPORT_DIR/serverless-impact.json"
rm -f "$STACK_REPORT" "$SERVERLESS_REPORT"

echo "Checking stack API contracts..."
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --baseBranch "$BASE_BRANCH" \
  --reportPath "$STACK_REPORT" \
  "${MERGE_BASE_ARGS[@]+"${MERGE_BASE_ARGS[@]}"}" &
STACK_PID=$!

echo "Checking serverless API contracts..."
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml \
  --baseBranch "$BASE_BRANCH" \
  --reportPath "$SERVERLESS_REPORT" \
  "${MERGE_BASE_ARGS[@]+"${MERGE_BASE_ARGS[@]}"}" &
SERVERLESS_PID=$!

STACK_EXIT=0
SERVERLESS_EXIT=0
wait $STACK_PID || STACK_EXIT=$?
wait $SERVERLESS_PID || SERVERLESS_EXIT=$?

if [ $STACK_EXIT -ne 0 ] || [ $SERVERLESS_EXIT -ne 0 ]; then
  echo --- Notify API owners
  if [[ "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
    ts-node .buildkite/scripts/steps/checks/notify_api_contract_owners.ts \
      "$STACK_REPORT" "$SERVERLESS_REPORT" || echo "Warning: failed to post PR notification"
  fi
  exit 1
fi
