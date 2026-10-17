#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

STORE_CACHE=${STORE_CACHE:-false}
STORE_CACHE_OUTPUT=$(mktemp)
trap 'rm -f "$STORE_CACHE_OUTPUT"' EXIT

if [[ ${STORE_CACHE} == "true" ]]; then
  echo "--- Run store_cache in the background"
  (.buildkite/scripts/steps/store_cache.sh > $STORE_CACHE_OUTPUT 2>&1) &
  store_cache_pid=$!
  echo "Store cache script running in the background with PID $store_cache_pid"
fi

# PR and merge-queue builds list their changed files with moon (and run the FTR moon shadow).
# This step skips bootstrap, so install the repo's pinned moon on its own. Don't reuse
# node_modules/.bin/moon: the merge queue's background store_cache.sh may still be writing it.
if [[ -n "${GITHUB_PR_NUMBER:-}" || "${BUILDKITE_PIPELINE_SLUG:-}" == "kibana-merge-queue" ]]; then
  echo '--- Install moon'
  MOON_VERSION=$(node -p "require('./package.json').dependencies['@moonrepo/cli']")
  MOON_INSTALL_DIR="$(mktemp -d)"
  retry 5 15 npm install --prefix "$MOON_INSTALL_DIR" --no-save --no-audit --no-fund --loglevel=error "@moonrepo/cli@${MOON_VERSION}"
  export MOON_BIN="$MOON_INSTALL_DIR/node_modules/.bin/moon"
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
  if [[ $store_cache_exit -ne 0 ]]; then
    echo "^^^ +++ store_cache failed with exit code $store_cache_exit (non-fatal)"
  fi
fi
