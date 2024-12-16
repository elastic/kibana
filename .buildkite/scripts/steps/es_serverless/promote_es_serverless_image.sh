#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BASE_ES_SERVERLESS_REPO=docker.elastic.co/elasticsearch-ci/elasticsearch-serverless
TARGET_IMAGE=docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified

SOURCE_IMAGE_OR_TAG=$1
if [[ $SOURCE_IMAGE_OR_TAG =~ :[a-zA-Z_-]+$ ]]; then
  # $SOURCE_IMAGE_OR_TAG was a full image
  SOURCE_IMAGE=$SOURCE_IMAGE_OR_TAG
else
  # $SOURCE_IMAGE_OR_TAG was an image tag
  SOURCE_IMAGE="$BASE_ES_SERVERLESS_REPO:$SOURCE_IMAGE_OR_TAG"
fi

if [[ "${PUBLISH_DOCKER_TAG:-}" =~ ^(1|true)$ ]]; then
  echo "--- Promoting ${SOURCE_IMAGE_OR_TAG} to ':latest-verified'"
else
  echo "--- Skipping ES Serverless image because PUBLISH_DOCKER_TAG is not set"
  exit 0
fi

echo "Re-tagging $SOURCE_IMAGE -> $TARGET_IMAGE"

docker manifest inspect "$SOURCE_IMAGE" | tee manifests.json

ARM_64_DIGEST=$(jq -r '.manifests[] | select(.platform.architecture == "arm64") | .digest' manifests.json)
AMD_64_DIGEST=$(jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest' manifests.json)

echo docker pull --platform linux/arm64 "$SOURCE_IMAGE@$ARM_64_DIGEST"
docker_with_retry pull --platform linux/arm64 "$SOURCE_IMAGE@$ARM_64_DIGEST"
echo linux/arm64 image pulled, with digest: $ARM_64_DIGEST

echo docker pull --platform linux/amd64 "$SOURCE_IMAGE@$AMD_64_DIGEST"
docker_with_retry pull --platform linux/amd64 "$SOURCE_IMAGE@$AMD_64_DIGEST"
echo linux/amd64 image pulled, with digest: $AMD_64_DIGEST

docker tag "$SOURCE_IMAGE@$ARM_64_DIGEST" "$TARGET_IMAGE-arm64"
docker tag "$SOURCE_IMAGE@$AMD_64_DIGEST" "$TARGET_IMAGE-amd64"

docker_with_retry push "$TARGET_IMAGE-arm64"
docker_with_retry push "$TARGET_IMAGE-amd64"

docker manifest rm "$TARGET_IMAGE" || echo "Nothing to delete"

docker manifest create "$TARGET_IMAGE" \
--amend "$TARGET_IMAGE-arm64" \
--amend "$TARGET_IMAGE-amd64"

docker manifest push "$TARGET_IMAGE"

docker manifest inspect "$TARGET_IMAGE"

ORIG_IMG_DATA=$(docker inspect "$SOURCE_IMAGE@$ARM_64_DIGEST")
ELASTIC_COMMIT_HASH=$(echo $ORIG_IMG_DATA | jq -r '.[].Config.Labels["org.opencontainers.image.revision"]')


echo "Image push to $TARGET_IMAGE successful."
echo "Promotion successful! Henceforth, thou shall be named Sir $TARGET_IMAGE"

echo "--- Annotating build with info"
cat << EOT | buildkite-agent annotate --style "success"
  <h2>Promotion successful!</h2>
  <br/>New image: $TARGET_IMAGE
  <br/>Source image: $SOURCE_IMAGE
  <br/>Kibana commit: <a href="https://github.com/elastic/kibana/commit/$BUILDKITE_COMMIT">$BUILDKITE_COMMIT</a>
  <br/>Elasticsearch commit: <a href="https://github.com/elastic/elasticsearch/commit/$ELASTIC_COMMIT_HASH">$ELASTIC_COMMIT_HASH</a>
EOT

cat << EOF | buildkite-agent pipeline upload
steps:
  - label: "Builds Kibana VM images for cache update"
    trigger: kibana-vm-images
    async: true
    build:
      env:
        IMAGES_CONFIG: "kibana/images.yml"
        RETRY: "1"
EOF
