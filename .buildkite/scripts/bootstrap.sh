#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "$(buildkite-agent meta-data get bootstrap_available --default '')" == "true" ]]; then
  echo "--- Download and extract bootstrap archive"
  buildkite-agent artifact download "bootstrap.tar" "$WORKSPACE"
  tar -xf "$WORKSPACE/bootstrap.tar"
fi

echo "--- yarn install and bootstrap"
retry 2 15 yarn kbn bootstrap

###
### upload ts-refs-cache artifacts as quickly as possible so they are available for download
###
if [[ "${BUILD_TS_REFS_CACHE_CAPTURE:-}" == "true" ]]; then
  echo "--- Upload ts-refs-cache"
  cd "$KIBANA_DIR/target/ts_refs_cache"
  gsutil cp "*.zip" 'gs://kibana-ci-ts-refs-cache/'
  cd "$KIBANA_DIR"
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  verify_no_git_changes 'yarn kbn bootstrap'
fi
