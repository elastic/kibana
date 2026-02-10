#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Update Scout Test Config Manifests'
node scripts/scout.js update-test-config-manifests

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --include-custom-servers --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

