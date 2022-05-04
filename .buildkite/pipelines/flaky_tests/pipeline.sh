#!/usr/bin/env bash

set -euo pipefail

export config="${KIBANA_FLAKY_TEST_RUNNER_CONFIG:-}"

if [[ "$config" == "" ]]; then
  echo "Please use the 'Trigger Flaky Test Runner' UI to trigger flaky test executions";
  echo ""
  echo "    https://ci-stats.kibana.dev/trigger_flaky_test_runner    "
  echo ""
  echo ""
  exit 1
fi

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

node .buildkite/pipelines/flaky_tests/pipeline.js | buildkite-agent pipeline upload
