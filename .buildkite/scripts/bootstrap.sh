#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/setup_bazel.sh

echo "--- yarn install and bootstrap"
if ! yarn kbn bootstrap; then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- yarn install and bootstrap, attempt 2"
  yarn kbn bootstrap --force-install
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'yarn kbn bootstrap'
fi

###
### upload ts-refs-cache artifacts as quickly as possible so they are available for download
###
if [[ "${BUILD_TS_REFS_CACHE_CAPTURE:-}" == "true" ]]; then
  echo "--- Build ts-refs-cache"
  node scripts/build_ts_refs.js --ignore-type-failures
  echo "--- Upload ts-refs-cache"
  cd "$KIBANA_DIR/target/ts_refs_cache"
  gsutil cp "*.zip" 'gs://kibana-ci-ts-refs-cache/'
  cd "$KIBANA_DIR"
fi
