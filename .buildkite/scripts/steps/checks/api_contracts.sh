#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check API Contracts

echo "Installing bump-cli dependencies..."
cd oas_docs && npm install --no-save && cd ..

BASE_BRANCH="${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-main}"
MERGE_BASE_ARGS=()
if [[ -n "${GITHUB_PR_MERGE_BASE:-}" ]]; then
  MERGE_BASE_ARGS=(--mergeBase "$GITHUB_PR_MERGE_BASE")
fi

echo "Checking stack API contracts..."
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --baseBranch "$BASE_BRANCH" \
  "${MERGE_BASE_ARGS[@]+"${MERGE_BASE_ARGS[@]}"}" &
STACK_PID=$!

echo "Checking serverless API contracts..."
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml \
  --baseBranch "$BASE_BRANCH" \
  "${MERGE_BASE_ARGS[@]+"${MERGE_BASE_ARGS[@]}"}" &
SERVERLESS_PID=$!

STACK_EXIT=0
SERVERLESS_EXIT=0
wait $STACK_PID || STACK_EXIT=$?
wait $SERVERLESS_PID || SERVERLESS_EXIT=$?

if [ $STACK_EXIT -ne 0 ] || [ $SERVERLESS_EXIT -ne 0 ]; then
  exit 1
fi
