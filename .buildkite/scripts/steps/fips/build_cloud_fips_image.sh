#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

echo "--- Download Kibana Distribution"

mkdir -p ./target
download_tmp_artifact "$KIBANA_TEST_SNAPSHOT_ARCHIVE" ./target "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build Cloud FIPS Distribution"

node scripts/build \
  --skip-initialize \
  --skip-generic-folders \
  --skip-platform-folders \
  --skip-cdn-assets \
  --skip-archives \
  --tar-zstd \
  --docker-images \
  --docker-tag-qualifier="$GIT_COMMIT" \
  --skip-docker-ubi \
  --skip-docker-cloud \
  --skip-docker-fips \
  --skip-docker-wolfi \
  --skip-docker-serverless \
  --skip-docker-contexts

BUILD_OUTPUT_IMAGE="docker.elastic.co/kibana-ci/kibana-cloud-fips:$VERSION-$GIT_COMMIT"
CLOUD_FIPS_IMAGE="$(kibana_ci_image_repository kibana-cloud-fips):$VERSION-$GIT_COMMIT"
retag_and_push_image "$BUILD_OUTPUT_IMAGE" "$CLOUD_FIPS_IMAGE"
cat <<EOF | buildkite-agent annotate --style "info" --context kibana-cloud-fips-image

  Kibana cloud FIPS image: \`$CLOUD_FIPS_IMAGE\`
EOF
