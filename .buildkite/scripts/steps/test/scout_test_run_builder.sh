#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
if [[ "${BUILDKITE_BRANCH:-}" == "main" || "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" == "main" ]]; then
  SCOUT_DISCOVERY_TARGET="local"
else
  SCOUT_DISCOVERY_TARGET="local-stateful-only"
fi
node scripts/scout discover-playwright-configs \
  --include-custom-servers \
  --target "$SCOUT_DISCOVERY_TARGET" \
  --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Running Scout API Integration Tests'
node scripts/scout.js run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/packages/shared/kbn-scout/test/scout/api/playwright.config.ts \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"

echo '--- Checking EUI Website Availability'
eui_check_exit=0
ts-node src/platform/packages/shared/kbn-scout/test/scout/scripts/check_eui_availability.ts || eui_check_exit=$?
if [ "$eui_check_exit" -eq 0 ]; then
  echo '--- Running Scout EUI Helpers Tests'
  SCOUT_TARGET_LOCATION='local' SCOUT_TARGET_ARCH='serverless' SCOUT_TARGET_DOMAIN='security_complete' \
  "${KIBANA_DIR:-$(pwd)}/node_modules/.bin/playwright" test \
    --project local \
    --grep serverless-security_complete \
    --config src/platform/packages/shared/kbn-scout/test/scout/ui/playwright.config.ts
else
  echo 'EUI website is not available - skipping EUI Helpers Tests'
fi

source .buildkite/scripts/steps/test/scout_upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
