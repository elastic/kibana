#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests --concurrencyLimit 3

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --include-custom-servers --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
# Contract: this artifact name is downloaded across BK steps by:
#   - .buildkite/scripts/steps/test/scout/configs.sh (regular Scout pipeline)
# Update that caller if you rename it. The flaky-test runner reads the manifest
# directly from disk in the same step (see discover_and_plan_flaky.sh) and does
# not depend on the artifact name.
buildkite-agent artifact upload "scout_playwright_configs.json"

