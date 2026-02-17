#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --include-custom-servers --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Running Scout API Integration Tests'
node scripts/scout.js run-tests \
  --location local \
  --arch stateful \
  --domain classic \
  --config src/platform/packages/shared/kbn-scout/test/scout/api/parallel.playwright.config.ts \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"

source .buildkite/scripts/steps/test/scout_upload_report_events.sh

echo '--- Producing Scout Test Execution Steps'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
