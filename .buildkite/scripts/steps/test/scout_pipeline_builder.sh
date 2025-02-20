#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo '--- Discover Playwright Configs and upload to Buildkite artifacts'
node scripts/scout discover-playwright-configs --save
buildkite-agent artifact upload scout_test_configs.json


echo '--- Scout Pick Test Group Run Order'
ts-node "$(dirname "${0}")/scout_pick_test_group_run_order.ts"
