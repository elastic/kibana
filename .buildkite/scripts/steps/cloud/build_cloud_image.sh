#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
BUILD_OUTPUT_IMAGE="docker.elastic.co/kibana-ci/kibana-cloud:$VERSION-$GIT_COMMIT"
KIBANA_CLOUD_IMAGE="$(kibana_ci_image_repository kibana-cloud):$VERSION-$GIT_COMMIT"

echo "--- Build Cloud Distribution"

set +e
DISTRIBUTION_EXISTS=$(docker manifest inspect $KIBANA_CLOUD_IMAGE &> /dev/null; echo $?)
set -e

if  [ $DISTRIBUTION_EXISTS -eq 0 ]; then
  echo "Distribution already exists, skipping build"
else
  node scripts/build \
    --cloud \
    --skip-cdn-assets \
    --skip-docker-contexts \
    --skip-docker-image-archive \
    --tar-zstd \
    --docker-tag-qualifier="$GIT_COMMIT"
  retag_and_push_image "$BUILD_OUTPUT_IMAGE" "$KIBANA_CLOUD_IMAGE"
fi

cat <<EOF | buildkite-agent annotate --style "info" --context kibana-cloud-image

  Kibana cloud image: \`$KIBANA_CLOUD_IMAGE\`
EOF
