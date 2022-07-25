#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

#echo '--- Pick Test Group Run Order'
#ts-node "$(dirname "${0}")/pick_test_group_run_order.ts"

echo '--- Hijacked Pick Test Group Run Order'
.buildkite/scripts/steps/checks/own_tests_ran.sh
