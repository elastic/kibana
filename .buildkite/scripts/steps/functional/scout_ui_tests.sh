#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

echo "--- Stateful: 'discover_enhanced' plugin UI Tests"
node scripts/scout run-tests \
  --stateful \
  --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo "--- Serverless Elasticsearch: 'discover_enhanced' plugin UI Tests"
node scripts/scout run-tests \
  --serverless=es \
  --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo "--- Serverless Observability: 'discover_enhanced' plugin UI Tests"
node scripts/scout run-tests \
  --serverless=oblt \
  --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo "--- Serverless Security: 'discover_enhanced' plugin UI Tests"
node scripts/scout run-tests \
  --serverless=security \
  --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION"
