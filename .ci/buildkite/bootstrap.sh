#!/usr/bin/env bash

set -euo pipefail

echo "--- yarn install and bootstrap"
yarn kbn bootstrap --verbose

# TODO add permissions for gsutil and enable this where needed
###
### upload ts-refs-cache artifacts as quickly as possible so they are available for download
###
echo "--- Upload ts-refs-cache"
if [[ "$BUILD_TS_REFS_CACHE_CAPTURE" == "true" ]]; then
  cd "$KIBANA_DIR/target/ts_refs_cache"
  gsutil cp "*.zip" 'gs://kibana-ci-ts-refs-cache/'
  cd "$KIBANA_DIR"
fi

# TODO bootstrap validation no git modifications
