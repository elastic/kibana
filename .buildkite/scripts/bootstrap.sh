#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

workspace="$(pwd)"
archiveName="workspace_$BUILDKITE_BUILD_ID.zip"

echo "--- downloading workspace"
cd ..
gsutil cp "gs://kibana-ci-workspaces/$archiveName" "$archiveName"

echo "--- extracting workspace"
cd "$workspace"
unzip -q "../$archiveName"

echo "cleanup"
rm "$archiveName"
cd "$workspace"

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
