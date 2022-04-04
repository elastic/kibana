#!/bin/bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  VERSION="$(jq -r '.version' package.json)"
  RELEASE_ARG="--release"
else
  VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
  RELEASE_ARG=""
fi

echo "--- Create Kibana Docker contexts"
mkdir -p target
node scripts/build "$RELEASE_ARG" --skip-initialize --skip-generic-folders --skip-platform-folders --skip-archives --docker-context-use-local-artifact

echo "--- Build default context"
DOCKER_BUILD_FOLDER=$(mktemp -d)

tar -xf target/kibana-[0-9]*-docker-build-context.tar.gz -C "$DOCKER_BUILD_FOLDER"
cd $DOCKER_BUILD_FOLDER

buildkite-agent artifact download "kibana-$VERSION-linux-x86_64.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

docker build .
