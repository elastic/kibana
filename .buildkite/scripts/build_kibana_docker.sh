#!/usr/bin/env bash

set -euo pipefail

export DOCKER_BUILDKIT=1

docker build \
  -t "us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/default-build:$BUILDKITE_COMMIT" \
  -f .buildkite/Dockerfile-build \
  --build-arg "BASE_IMAGE=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT" \
  --build-arg "GIT_COMMIT=$BUILDKITE_COMMIT" \
  --progress plain \
  .

docker push "us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/default-build:$BUILDKITE_COMMIT"
