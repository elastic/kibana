#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Pick Test Group Run Order'
ts-node "$(dirname "${0}")/pick_test_group_run_order.ts"
