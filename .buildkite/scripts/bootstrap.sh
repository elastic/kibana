#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

workspace="$(pwd)"
tarball="workspace_$BUILDKITE_BUILD_ID.tar"

echo "--- downloading workspace"
cd ..
time gsutil cp "gs://kibana-ci-workspaces/$tarball" "$tarball"

echo "--- extracting workspace"
time tar -xf "$tarball" -C "$workspace"

echo "cleanup"
time rm "$tarball"
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
