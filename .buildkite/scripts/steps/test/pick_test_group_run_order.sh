#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/test/test_group_env.sh

echo '--- Pick Test Group Run Order'
node "$(dirname "${0}")/pick_test_group_run_order.js"
