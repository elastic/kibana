#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source "$(dirname "$0")/../../common/util.sh"
source .buildkite/scripts/steps/artifacts/env.sh

KIBANA_DOCKER_CONTEXT="${KIBANA_DOCKER_CONTEXT:="default"}"

echo "--- Create contexts"
mkdir -p target
node scripts/build --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives --skip-cdn-assets --docker-context-use-local-artifact "${BUILD_ARGS[@]}"

echo "--- Setup context"
DOCKER_BUILD_FOLDER=$(mktemp -d)
DOCKER_BUILD_ARGS=''
case $KIBANA_DOCKER_CONTEXT in
  default)
    DOCKER_CONTEXT_FILE="kibana-$FULL_VERSION-docker-build-context.tar.gz"
  ;;
  cloud)
    DOCKER_CONTEXT_FILE="kibana-cloud-$FULL_VERSION-docker-build-context.tar.gz"
  ;;
  ubi)
    DOCKER_CONTEXT_FILE="kibana-ubi-$FULL_VERSION-docker-build-context.tar.gz"
  ;;
  ironbank)
    DOCKER_CONTEXT_FILE="kibana-ironbank-$FULL_VERSION-docker-build-context.tar.gz"
    DOCKER_BUILD_ARGS='--build-arg BASE_REGISTRY=docker.elastic.co --build-arg BASE_IMAGE=ubi9/ubi --build-arg BASE_TAG=latest'

    # See src/dev/build/tasks/os_packages/docker_generator/templates/ironbank/hardening_manifest.yaml
    curl --retry 8 -sS -L -o "$DOCKER_BUILD_FOLDER/tini" "https://github.com/krallin/tini/releases/download/v0.19.0/tini-amd64"
    echo "8053cc21a3a9bdd6042a495349d1856ae8d3b3e7664c9654198de0087af031f5d41139ec85a2f5d7d2febd22ec3f280767ff23b9d5f63d490584e2b7ad3c218c  $DOCKER_BUILD_FOLDER/tini" | sha512sum -c -
    curl --retry 8 -sS -L -o "$DOCKER_BUILD_FOLDER/NotoSansCJK-Regular.ttc" https://github.com/googlefonts/noto-cjk/raw/NotoSansV2.001/NotoSansCJK-Regular.ttc
    echo "0ce56bde1853fed3e53282505bac65707385275a27816c29712ab04c187aa249797c82c58759b2b36c210d4e2683eda92359d739a8045cb8385c2c34d37cc9e1  $DOCKER_BUILD_FOLDER/NotoSansCJK-Regular.ttc" | sha512sum -c -

    echo "Warning: this will build an approximation of the Iron Bank context, using a swapped base image"
  ;;
esac


tar -xf "target/$DOCKER_CONTEXT_FILE" -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER

download_artifact "kibana-$FULL_VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build context"
docker build $DOCKER_BUILD_ARGS .
