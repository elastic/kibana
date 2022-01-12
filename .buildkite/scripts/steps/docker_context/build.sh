#!/bin/bash

set -euo pipefail

echo "--- Create Kibana Docker contexts"
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives

DOCKER_BUILD_FOLDER=$(mktemp)

tar -xf target/kibana-[0-9]*-docker-build-context.tar.gz -C "$DOCKER_BUILD_FOLDER"

cd $DOCKER_BUILD_FOLDER

echo "--- Build default context"
docker build .