#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --include-custom-servers --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
# Contract: this artifact name is also downloaded by:
#   - .buildkite/scripts/steps/test/scout/configs.sh           (regular Scout pipeline)
#   - .buildkite/pipelines/flaky_tests/pick_scout_flaky_run_order.ts (flaky-test runner)
# Update those callers if you rename it.
buildkite-agent artifact upload "scout_playwright_configs.json"

