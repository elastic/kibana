#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

GIT_ABBREV_COMMIT=${BUILDKITE_COMMIT:0:12}
if [[ "${BUILDKITE_PULL_REQUEST:-false}" == "false" ]]; then
  KIBANA_IMAGE_TAG="git-$GIT_ABBREV_COMMIT"
else
  KIBANA_IMAGE_TAG="pr-$BUILDKITE_PULL_REQUEST-$GIT_ABBREV_COMMIT"
fi

KIBANA_BASE_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless"
export KIBANA_IMAGE="$KIBANA_BASE_IMAGE:$KIBANA_IMAGE_TAG"

echo "--- Verify manifest does not already exist"
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

echo "Checking manifest for $KIBANA_IMAGE"
if docker manifest inspect $KIBANA_IMAGE &> /dev/null; then
  echo "Manifest already exists, exiting"
  exit 0
fi

docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest

echo "--- Build images"
node scripts/build \
  --debug \
  --release \
  --docker-cross-compile \
  --docker-images \
  --docker-namespace="kibana-ci" \
  --docker-tag="$KIBANA_IMAGE_TAG" \
  --skip-docker-ubuntu \
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
docker image push "$KIBANA_IMAGE-arm64"
docker image push "$KIBANA_IMAGE-amd64"

echo "--- Create and push manifests"
docker manifest create \
  "$KIBANA_IMAGE" \
  --amend "$KIBANA_IMAGE-arm64" \
  --amend "$KIBANA_IMAGE-amd64"
docker manifest push "$KIBANA_IMAGE"

docker logout docker.elastic.co

cat << EOF | buildkite-agent annotate --style "info" --context image
  ### Serverless Images

  Manifest: \`$KIBANA_IMAGE\`

  AMD64: \`$KIBANA_IMAGE-amd64\`

  ARM64: \`$KIBANA_IMAGE-arm64\`
EOF
