#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

VERSION="$(jq -r '.version' package.json)-SNAPSHOT"

echo "--- Download Kibana Distribution"

mkdir -p ./target
download_tmp_artifact "kibana-default.tar.zst" ./target "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
mv ./target/kibana-default.tar.zst ./target/kibana-$VERSION-linux-x86_64.tar.zst

echo "--- Build Cloud Distribution"

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
  --skip-docker-cloud-fips \
  --skip-docker-fips \
  --skip-docker-wolfi \
  --skip-docker-serverless \
  --skip-docker-contexts

BUILD_OUTPUT_IMAGE="docker.elastic.co/kibana-ci/kibana-cloud:$VERSION-$GIT_COMMIT"
CLOUD_IMAGE="$(kibana_ci_image_repository kibana-cloud):$VERSION-$GIT_COMMIT"
retag_and_push_image "$BUILD_OUTPUT_IMAGE" "$CLOUD_IMAGE"
cat <<EOF | buildkite-agent annotate --style "info" --context kibana-cloud-image

  Kibana cloud image: \`$CLOUD_IMAGE\`
EOF
