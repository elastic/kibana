#!/usr/bin/env bash
set -euo pipefail

# Executor-related setup

echo '--- Executor Setup'

# if FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE is set,
# we should clear previously cached EPR images,
# (as the package registry image is quite big to keep 2 versions of)
DEFAULT_FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE='docker.elastic.co/kibana-ci/package-registry-distribution:lite'

# Test docker is available
if [[ `command -v docker` \
      && -n "${FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE:-}" \
      && "${FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE}" != "${DEFAULT_FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE}" \
]]; then
  echo 'Clearing previously cached EPR images'
  EPR_IMAGES=$(docker images -q "${DEFAULT_FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE}")
  if [[ -n "${EPR_IMAGES}" ]]; then
    docker rmi -f "${EPR_IMAGES}"
    echo "Cleared ${EPR_IMAGES} EPR images"
  fi
fi
