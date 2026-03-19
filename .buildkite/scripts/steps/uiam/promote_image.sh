#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BASE_UIAM_REPO=docker.elastic.co/cloud-ci/uiam
TARGET_IMAGE=docker.elastic.co/kibana-ci/uiam:latest-verified

SOURCE_IMAGE_OR_TAG=${1:-}
if [[ -z "$SOURCE_IMAGE_OR_TAG" ]]; then
  echo "Usage: $0 <image-or-tag>"
  echo "Example: $0 docker.elastic.co/cloud-ci/uiam:latest"
  echo "Example: $0 git-1171ce2fde41"
  exit 1
fi

if [[ $SOURCE_IMAGE_OR_TAG =~ :[a-zA-Z0-9_.-]+$ ]]; then
  # $SOURCE_IMAGE_OR_TAG was a full image
  SOURCE_IMAGE=$SOURCE_IMAGE_OR_TAG
else
  # $SOURCE_IMAGE_OR_TAG was an image tag
  SOURCE_IMAGE="$BASE_UIAM_REPO:$SOURCE_IMAGE_OR_TAG"
fi

echo "--- Promoting ${SOURCE_IMAGE_OR_TAG} to '$TARGET_IMAGE'"

echo "Re-tagging $SOURCE_IMAGE -> $TARGET_IMAGE"

# Check if the image has a multi-arch manifest
if docker manifest inspect "$SOURCE_IMAGE" > manifests.json 2>/dev/null; then
  # Multi-arch image handling
  ARM_64_DIGEST=$(jq -r '.manifests[] | select(.platform.architecture == "arm64") | .digest // empty' manifests.json)
  AMD_64_DIGEST=$(jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest // empty' manifests.json)

  if [[ -n "$ARM_64_DIGEST" && -n "$AMD_64_DIGEST" ]]; then
    echo "Multi-arch image detected, pulling both architectures..."

    echo "docker pull --platform linux/arm64 $SOURCE_IMAGE@$ARM_64_DIGEST"
    docker_with_retry pull --platform linux/arm64 "$SOURCE_IMAGE@$ARM_64_DIGEST"
    echo "linux/arm64 image pulled, with digest: $ARM_64_DIGEST"

    echo "docker pull --platform linux/amd64 $SOURCE_IMAGE@$AMD_64_DIGEST"
    docker_with_retry pull --platform linux/amd64 "$SOURCE_IMAGE@$AMD_64_DIGEST"
    echo "linux/amd64 image pulled, with digest: $AMD_64_DIGEST"

    docker tag "$SOURCE_IMAGE@$ARM_64_DIGEST" "$TARGET_IMAGE-arm64"
    docker tag "$SOURCE_IMAGE@$AMD_64_DIGEST" "$TARGET_IMAGE-amd64"

    docker_with_retry push "$TARGET_IMAGE-arm64"
    docker_with_retry push "$TARGET_IMAGE-amd64"

    docker manifest rm "$TARGET_IMAGE" || echo "Nothing to delete"

    docker manifest create "$TARGET_IMAGE" \
      --amend "$TARGET_IMAGE-arm64" \
      --amend "$TARGET_IMAGE-amd64"

    docker manifest push "$TARGET_IMAGE"
  else
    # Fallback to single-arch handling if one of the architectures is missing
    echo "One or more architectures missing from manifest, using single-arch promotion..."
    docker_with_retry pull "$SOURCE_IMAGE"
    docker tag "$SOURCE_IMAGE" "$TARGET_IMAGE"
    docker_with_retry push "$TARGET_IMAGE"
  fi
else
  # Single-arch image handling (no manifest)
  echo "Single-arch image detected, pulling and re-tagging..."
  docker_with_retry pull "$SOURCE_IMAGE"
  docker tag "$SOURCE_IMAGE" "$TARGET_IMAGE"
  docker_with_retry push "$TARGET_IMAGE"
fi

docker manifest inspect "$TARGET_IMAGE" || docker inspect "$TARGET_IMAGE"

ORIG_IMG_DATA=$(docker inspect "$SOURCE_IMAGE" 2>/dev/null || echo '[]')
UIAM_COMMIT_HASH=$(echo "$ORIG_IMG_DATA" | jq -r '.[].Config.Labels["org.opencontainers.image.revision"] // "unknown"')

echo "Image push to $TARGET_IMAGE successful."

echo "--- Annotating build with info"
cat << EOT | buildkite-agent annotate --style "success"
  <h2>UIAM Promotion successful!</h2>
  <br/>New image: $TARGET_IMAGE
  <br/>Source image: $SOURCE_IMAGE
  <br/>Kibana commit: <a href="https://github.com/elastic/kibana/commit/$BUILDKITE_COMMIT">$BUILDKITE_COMMIT</a>
  <br/>UIAM commit: $UIAM_COMMIT_HASH
EOT

cat << EOF | buildkite-agent pipeline upload
steps:
  - label: "Update cache for UIAM image"
    trigger: kibana-vm-images
    async: true
    build:
      env:
        IMAGES_CONFIG: 'kibana/image_cache.tpl.yml'
        BASE_IMAGES_CONFIG: 'core/images.yml,kibana/base_image.yml,kibana/packages_layer.yml'
        RETRY: "1"
EOF
