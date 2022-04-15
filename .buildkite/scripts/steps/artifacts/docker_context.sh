#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source .buildkite/scripts/steps/artifacts/env.sh

DOCKER_CONTEXT="${DOCKER_CONTEXT:="default"}"

echo "--- Create contexts"
mkdir -p target
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives --docker-context-use-local-artifact $(echo "$BUILD_ARGS")

echo "--- Setup context"
DOCKER_BUILD_FOLDER=$(mktemp -d)

if [[ "$DOCKER_CONTEXT" == "default" ]]; then
  DOCKER_CONTEXT_FILE="kibana-$FULL_VERSION-docker-build-context.tar.gz"
elif [[ "$DOCKER_CONTEXT" == "cloud" ]];
  DOCKER_CONTEXT_FILE="kibana-cloud-$FULL_VERSION-docker-build-context.tar.gz"
fi

tar -xf "target/$DOCKER_CONTEXT_FILE" -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER

buildkite-agent artifact download "kibana-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
if [[ "$DOCKER_CONTEXT" == "cloud" ]]; then
  buildkite-agent artifact download "metricbeat-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  buildkite-agent artifact download "filebeat-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
fi

echo "--- Build context"
docker build .
