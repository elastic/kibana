#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(dirname $0)
DOCKER_BUILD_CONTEXT_DIR="$SCRIPT_DIR/nodejs_build/"

docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

DOCKER_BUILDKIT=1 docker buildx build --progress=plain  \
  --platform linux/amd64,linux/arm64 \
  --build-arg GROUP_ID=1000 --build-arg USER_ID=1000 \
  --tag nodejs-custom:18.15.0 $DOCKER_BUILD_CONTEXT_DIR

docker pull --platform linux/amd64 nodejs-custom:18.15.0
docker pull --platform linux/arm64 nodejs-custom:18.15.0

echo '--- Downloading node source'

curl --create-dirs --output-dir ./workdir/src -fsSLO --compressed \
  https://nodejs.org/download/release/v18.15.0/node-v18.15.0.tar.xz
tar -xf ./workdir/src/node-v18.15.0.tar.xz -C ./workdir/src



echo '--- Buidling node for linux/amd64'

docker run --rm -it --platform linux/amd64 \
  -v ./workdir:/home/node/workdir \
  nodejs-custom:18.15.0 \
  https://unofficial-builds.nodejs.org/download/release/ \
  v18.15.0


echo '--- Buidling node for linux/arm64'

docker run --rm -it --platform linux/arm64 \
  -v ./workdir:/home/node/workdir \
  nodejs-custom:18.15.0 \
  https://unofficial-builds.nodejs.org/download/release/ \
  v18.15.0
