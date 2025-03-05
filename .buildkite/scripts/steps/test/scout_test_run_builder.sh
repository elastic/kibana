#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --save
buildkite-agent artifact upload ".scout/scout_playwright_configs.json"

echo '--- Scout Test Run Builder'
ts-node "$(dirname "${0}")/scout_test_run_builder.ts"
