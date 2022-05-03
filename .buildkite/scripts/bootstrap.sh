#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/setup_bazel.sh

BAZEL_REGION="us-central1"
if [[ "$(curl -is metadata.google.internal || true)" ]]; then
  # projects/1003139005402/zones/us-central1-a -> us-central1-a -> us-central1
  BAZEL_REGION=$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/zone | rev | cut -d'/' -f1 | cut -c3- | rev)
fi

BAZEL_BUCKET="kibana-ci-bazel_$BAZEL_REGION"

cat << EOF > .bazelrc
import %workspace%/.bazelrc.common
build --remote_cache=https://storage.googleapis.com/$BAZEL_BUCKET
build --google_default_credentials
EOF

echo "--- yarn install and bootstrap"
echo "Using Bazel remote cache bucket: $BAZEL_BUCKET"

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
