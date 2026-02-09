#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check API Contracts

KIBANA_VERSION="$(jq -r '.version' package.json)"

echo "Checking stack API contracts..."
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --version "$KIBANA_VERSION"

echo "Checking serverless API contracts..."
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml
