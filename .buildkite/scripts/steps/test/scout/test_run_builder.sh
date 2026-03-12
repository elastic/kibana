#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
# Look for both stateful and serverless tests when run on "main" / PRs to "main", otherwise only stateful tests to be discovered and run
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
  --config src/platform/packages/shared/kbn-scout/test/scout/api/parallel.playwright.config.ts \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"

source .buildkite/scripts/steps/test/scout/upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/test_run_builder.ts"
