#!/bin/bash

set -euo pipefail

export DOCKER_BUILDKIT=1

# docker build -t "us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT" -f .buildkite/Dockerfile . --progress plain
# docker push "us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT"

docker buildx create --use && \
docker buildx build -t us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT -f .buildkite/Dockerfile . --progress plain \
  --output type=image,name=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:$BUILDKITE_COMMIT,push=true \
  --cache-to type=registry,ref=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:cache \
  --cache-from type=registry,ref=us-central1-docker.pkg.dev/elastic-kibana-184716/kibana-buildkite-docker/buildkite/ci/base:cache
