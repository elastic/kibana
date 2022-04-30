#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Create Kibana Docker contexts"
mkdir -p target
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives

echo "--- Build default context"
DOCKER_BUILD_FOLDER=$(mktemp -d)

tar -xf target/kibana-[0-9]*-docker-build-context.tar.gz -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER
docker build .
