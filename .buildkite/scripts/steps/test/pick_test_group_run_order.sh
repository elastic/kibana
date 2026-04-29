#!/usr/bin/env bash

set -euo pipefail

# This step only runs a Node.js script to compute test group ordering;
# it never needs the dev-mode shared webpack bundles (monaco, ui-shared-deps).
export KBN_BOOTSTRAP_NO_PREBUILT=true

source .buildkite/scripts/bootstrap.sh

echo '--- Pick Test Group Run Order'
ts-node "$(dirname "${0}")/pick_test_group_run_order.ts"
