#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

echo '--- Verify Playwright CLI is functional'
node scripts/scout run-playwright-test-check

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --save
cp .scout/test_configs/scout_playwright_configs.json scout_playwright_configs.json
buildkite-agent artifact upload "scout_playwright_configs.json"

echo '--- Scout Test Run Builder'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
