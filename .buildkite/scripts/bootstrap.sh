#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- downloading and extracting workspace state"
workspace="$(pwd)"
cd ..
tarball="workspace-$BUILDKITE_JOB_ID.tar"
buildkite-agent artifact download workspace.tar "$tarball"
tar -xf "$tarball" -C "$workspace"
rm "$tarball"
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
