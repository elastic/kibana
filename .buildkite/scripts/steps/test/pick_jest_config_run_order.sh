#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/test/jest_env.sh

echo '--- Pick Jest Config Run Order'
node "$(dirname "${0}")/pick_jest_config_run_order.js"
