#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source "$(dirname "$0")/../../common/util.sh"
source .buildkite/scripts/steps/artifacts/env.sh

KIBANA_DOCKER_CONTEXT="${KIBANA_DOCKER_CONTEXT:="default"}"

echo "--- Create contexts"
mkdir -p target
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives --docker-context-use-local-artifact $(echo "$BUILD_ARGS")

echo "--- Setup context"
DOCKER_BUILD_FOLDER=$(mktemp -d)

if [[ "$KIBANA_DOCKER_CONTEXT" == "default" ]]; then
  DOCKER_CONTEXT_FILE="kibana-$FULL_VERSION-docker-build-context.tar.gz"
elif [[ "$KIBANA_DOCKER_CONTEXT" == "cloud" ]]; then
  DOCKER_CONTEXT_FILE="kibana-cloud-$FULL_VERSION-docker-build-context.tar.gz"
elif [[ "$KIBANA_DOCKER_CONTEXT" == "ubi8" ]]; then
  DOCKER_CONTEXT_FILE="kibana-ubi8-$FULL_VERSION-docker-build-context.tar.gz"
elif [[ "$KIBANA_DOCKER_CONTEXT" == "ubi9" ]]; then
  DOCKER_CONTEXT_FILE="kibana-ubi9-$FULL_VERSION-docker-build-context.tar.gz"
fi

tar -xf "target/$DOCKER_CONTEXT_FILE" -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER

download_artifact "kibana-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build context"
docker build .
