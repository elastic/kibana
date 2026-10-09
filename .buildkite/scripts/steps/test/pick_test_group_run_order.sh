#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Pick Test Group Run Order'
ts-node "$(dirname "${0}")/pick_test_group_run_order.ts"

echo '--- Upload test run order artifacts to GCS'
if [[ -f jest_run_order.json ]]; then
  upload_tmp_artifact jest_run_order.json jest_run_order.json "$BUILDKITE_BUILD_ID"
fi

if [[ -f ftr_run_order.json ]]; then
  upload_tmp_artifact ftr_run_order.json ftr_run_order.json "$BUILDKITE_BUILD_ID"
fi
