#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

STORE_CACHE=${STORE_CACHE:-false}
STORE_CACHE_OUTPUT=.buildkite/scripts/steps/store_cache.txt

if [[ ${STORE_CACHE} == "true" ]]; then
  echo "--- Run store_cache in the background"
  (.buildkite/scripts/steps/store_cache.sh > $STORE_CACHE_OUTPUT 2>&1) &
  store_cache_pid=$!
  echo "Store cache script running in the background with PID $store_cache_pid"
fi

echo '--- Pick Test Group Run Order'
node "$(dirname "${0}")/pick_test_group_run_order.ts"

echo '--- Upload test run order artifacts to GCS'
if [[ -f jest_run_order.json ]]; then
  upload_tmp_artifact jest_run_order.json jest_run_order.json "$BUILDKITE_BUILD_ID"
fi

if [[ -f ftr_run_order.json ]]; then
  upload_tmp_artifact ftr_run_order.json ftr_run_order.json "$BUILDKITE_BUILD_ID"
fi

if [[ ${STORE_CACHE} == "true" ]]; then
  echo "--- Wait for store_cache"
  store_cache_exit=0
  wait "$store_cache_pid" || store_cache_exit=$?
  cat $STORE_CACHE_OUTPUT
  exit $store_cache_exit
fi
