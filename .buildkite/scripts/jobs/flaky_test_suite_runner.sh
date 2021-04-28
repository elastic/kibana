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
      echo 'Bootstrap'
    label: Bootstrap
    agents:
      queue: bootstrap
    key: bootstrap

  - command: |
      echo 'Build Default Distro'
    label: Build Default Distro
    agents:
      queue: bootstrap
    key: default-build
    depends_on: bootstrap

  - command: 'echo "Running $TEST_SUITE"; sleep 10;'
    label: 'Run $TEST_SUITE'
    agents:
      queue: ci-group
    parallelism: $RUN_COUNT
    concurrency: 25
    concurrency_group: '$UUID'
    depends_on: default-build
EOF
