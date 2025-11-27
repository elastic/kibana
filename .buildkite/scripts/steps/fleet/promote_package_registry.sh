#!/bin/bash

set -euo pipefail

PACKAGE_REGISTRY_BASE_IMAGE='docker.elastic.co/package-registry/distribution:lite'
PACKAGE_REGISTRY_TEMP_IMAGE='docker.elastic.co/kibana-ci/package-registry-distribution:temp'
PACKAGE_REGISTRY_TARGET_IMAGE='docker.elastic.co/kibana-ci/package-registry-distribution:lite'

# First step: promote base image to temp and trigger VM images job to update cache
promote_temp_and_cache() {
  echo "--- Promoting base image to temp and triggering VM images job..."
  echo "$PACKAGE_REGISTRY_TEMP_IMAGE := $PACKAGE_REGISTRY_BASE_IMAGE"
  docker buildx imagetools create -t "$PACKAGE_REGISTRY_TEMP_IMAGE" "$PACKAGE_REGISTRY_BASE_IMAGE"

  cat << EOF | buildkite-agent pipeline upload
steps:
  - label: "Update cache for EPR image"
    trigger: kibana-vm-images
    id: "epr-image-cache-update"
    build:
      env:
        EPR_IMAGE: "$PACKAGE_REGISTRY_TEMP_IMAGE"
        IMAGES_CONFIG: 'kibana/image_cache.tpl.yml'
        BASE_IMAGES_CONFIG: 'core/images.yml,kibana/base_image.yml,kibana/packages_layer.yml'
        RETRY: "1"
  - label: "Promote docker.elastic.co/package-registry/distribution:lite"
    command: ".buildkite/scripts/steps/fleet/promote_package_registry.sh finalize-promotion"
    id: "promote-epr-image"
    depends_on:
      - epr-image-cache-update
    agents:
        image: family/kibana-ubuntu-2404
        imageProject: elastic-images-prod
        provider: gcp
        machineType: n2-standard-4
EOF
}

# Second step: finalize promotion from temp to target,
# the cached image name is different, but the layers should be the same
finalize_promotion() {
  echo "--- Promoting temp image to final target..."
  echo "$PACKAGE_REGISTRY_TARGET_IMAGE := $PACKAGE_REGISTRY_TEMP_IMAGE"
  docker buildx imagetools create -t "$PACKAGE_REGISTRY_TARGET_IMAGE" "$PACKAGE_REGISTRY_TEMP_IMAGE"
}

# Parse command line argument
if [[ $# -eq 0 ]]; then
  echo "Error: No entrypoint specified"
  echo "Usage: $0 <promote-temp-and-build-cache|finalize-promotion>"
  exit 1
fi

ENTRYPOINT="$1"

if [[ "$BUILDKITE_BRANCH" != "main" ]]; then
  echo "Skipping promotion for untracked branch $BUILDKITE_BRANCH"
  exit 0
fi

case "$ENTRYPOINT" in
  promote-temp-and-build-cache)
    promote_temp_and_cache
    ;;
  finalize-promotion)
    finalize_promotion
    ;;
  *)
    echo "Error: Invalid entrypoint '$ENTRYPOINT'"
    echo "Usage: $0 <promote-temp-and-build-cache|finalize-promotion>"
    exit 1
    ;;
esac
