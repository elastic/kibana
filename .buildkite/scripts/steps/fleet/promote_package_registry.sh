#!/bin/bash

set -euo pipefail

PACKAGE_REGISTRY_BASE_IMAGE='docker.elastic.co/package-registry/distribution:lite'
PACKAGE_REGISTRY_TARGET_IMAGE='docker.elastic.co/kibana-ci/package-registry-distribution:lite'

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  docker buildx imagetools create -t "$PACKAGE_REGISTRY_TARGET_IMAGE" "$PACKAGE_REGISTRY_BASE_IMAGE"
  cat << EOF | buildkite-agent pipeline upload
steps:
  - label: "Update cache for EPR image"
    trigger: kibana-vm-images
    async: true
    build:
      env:
        IMAGES_CONFIG: 'kibana/image_cache.tpl.yml'
        BASE_IMAGES_CONFIG: 'core/images.yml,kibana/base_image.yml,kibana/packages_layer.yml'
        RETRY: "1"
EOF
else
  echo "Skipping promotion for untracked branch $BUILDKITE_BRANCH"
fi
