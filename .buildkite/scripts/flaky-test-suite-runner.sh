#!/usr/bin/env bash

set -euo pipefail

TEST_SUITE="$(buildkite-agent meta-data get 'test-suite')"
export TEST_SUITE

RUN_COUNT="$(buildkite-agent meta-data get 'run-count')"
export RUN_COUNT

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

cat << EOF
steps:
  - command: |
      echo export DOCKER_BUILDKIT=1 && \
      echo docker build -t gcr.io/elastic-kibana-184716/buildkite/ci/base:\$BUILDKITE_COMMIT -f .ci/Dockerfile . --progress plain && \
      echo docker push gcr.io/elastic-kibana-184716/buildkite/ci/base:\$BUILDKITE_COMMIT
    label: Bootstrap
    agents:
      queue: bootstrap
  - wait
  - command: |
      echo export DOCKER_BUILDKIT=1 && \
      echo docker build -t gcr.io/elastic-kibana-184716/buildkite/ci/default-build:\$BUILDKITE_COMMIT -f .ci/Dockerfile-build --build-arg BASE_IMAGE=gcr.io/elastic-kibana-184716/buildkite/ci/base:\$BUILDKITE_COMMIT . --progress plain && \
      echo docker push gcr.io/elastic-kibana-184716/buildkite/ci/default-build:\$BUILDKITE_COMMIT
    label: Build Default Distro
    agents:
      queue: bootstrap
    key: default-build
  - command: 'echo "Running $TEST_SUITE"; sleep 10;'
    label: 'Run $TEST_SUITE'
    agents:
      queue: ci-group
    parallelism: $RUN_COUNT
    concurrency: 25
    concurrency_group: '$UUID'
    depends_on: default-build
EOF
