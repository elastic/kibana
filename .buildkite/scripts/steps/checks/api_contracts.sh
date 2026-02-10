#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check API Contracts

echo "Installing bump-cli dependencies..."
cd oas_docs && npm install --no-save && cd ..

BASE_BRANCH="${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-main}"

echo "Checking stack API contracts against ${BASE_BRANCH}..."
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --baseBranch "$BASE_BRANCH"

echo "Checking serverless API contracts against ${BASE_BRANCH}..."
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml \
  --baseBranch "$BASE_BRANCH"
