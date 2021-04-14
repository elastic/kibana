#!/bin/bash

set -euo pipefail

export DOCKER_BUILDKIT=1

docker build -t "gcr.io/elastic-kibana-184716/buildkite/ci/base:$BUILDKITE_COMMIT" -f .buildkite/Dockerfile . --progress plain
docker push "gcr.io/elastic-kibana-184716/buildkite/ci/base:$BUILDKITE_COMMIT"
