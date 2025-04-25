#!/bin/bash
if [ -z "${KIBANA_MKI_USE_LATEST_COMMIT+x}" ] || [ "$KIBANA_MKI_USE_LATEST_COMMIT" = "0" ]; then
    echo "As we not testing against latest kibana image, this step is exiting with exit code 0"
    exit 0
fi


.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh
source .buildkite/scripts/common/util.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:12}
KIBANA_IMAGE_TAG="sec-sol-qg-$GIT_ABBREV_COMMIT"


KIBANA_BASE_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless"
export KIBANA_IMAGE="$KIBANA_BASE_IMAGE:$KIBANA_IMAGE_TAG"

echo "--- Verify manifest does not already exist"
echo "Checking manifest for $KIBANA_IMAGE"
if docker manifest inspect $KIBANA_IMAGE &> /dev/null; then
  echo "Manifest already exists, exiting"
  exit 0
fi

docker_with_retry pull $KIBANA_BASE_IMAGE:latest

echo "--- Build images"
node scripts/build \
  --debug \
  --release \
  --docker-cross-compile \
  --docker-images \
  --docker-namespace="kibana-ci" \
  --docker-tag="$KIBANA_IMAGE_TAG" \
  --skip-docker-ubuntu \
  --skip-docker-wolfi \
  --skip-docker-ubi \
  --skip-docker-cloud \
  --skip-docker-contexts \
  --skip-cdn-assets

echo "--- Tag images"
docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-amd64"

docker rmi "$KIBANA_IMAGE"
docker load < "target/kibana-serverless-$BASE_VERSION-docker-image-aarch64.tar.gz"
docker tag "$KIBANA_IMAGE" "$KIBANA_IMAGE-arm64"

echo "--- Push images"
docker_with_retry push "$KIBANA_IMAGE-arm64"
docker_with_retry push "$KIBANA_IMAGE-amd64"

echo "--- Create and push manifests"
docker manifest create \
  "$KIBANA_IMAGE" \
  --amend "$KIBANA_IMAGE-arm64" \
  --amend "$KIBANA_IMAGE-amd64"
docker manifest push "$KIBANA_IMAGE"

if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]] && [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  docker manifest create \
    "$KIBANA_BASE_IMAGE:latest" \
    --amend "$KIBANA_IMAGE-arm64" \
    --amend "$KIBANA_IMAGE-amd64"
  docker manifest push "$KIBANA_BASE_IMAGE:latest"
fi

cat << EOF | buildkite-agent annotate --style "info" --context image
  ### Serverless Images

  Manifest: \`$KIBANA_IMAGE\`

  AMD64: \`$KIBANA_IMAGE-amd64\`

  ARM64: \`$KIBANA_IMAGE-arm64\`
EOF
