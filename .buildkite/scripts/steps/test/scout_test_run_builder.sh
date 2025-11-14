#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Running Scout API Integration Tests'
node scripts/scout.js run-tests \
--serverless=security \
--config src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts \
--kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo '--- Running Scout EUI Helpers Tests'
"${KIBANA_DIR:-$(pwd)}/node_modules/.bin/playwright" test \
  --project local \
  --grep @svlSecurity \
  --config src/platform/packages/shared/kbn-scout/test/scout/ui/playwright.config.ts

source .buildkite/scripts/steps/test/scout_upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
