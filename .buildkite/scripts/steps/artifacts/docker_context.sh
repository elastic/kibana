#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/steps/artifacts/env.sh

echo "--- Create contexts"
mkdir -p target
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives --docker-context-use-local-artifact $(echo "$BUILD_ARGS")

echo "--- Setup default context"
DOCKER_BUILD_FOLDER=$(mktemp -d)

tar -xf target/kibana-[0-9]*-docker-build-context.tar.gz -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER

buildkite-agent artifact download "kibana-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build context"
docker build .
