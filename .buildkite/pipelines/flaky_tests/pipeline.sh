#!/usr/bin/env bash

set -euo pipefail

if [[ "$KIBANA_FLAKY_TEST_RUNNER_CONFIG" == "" ]]; then
  echo "Please use the 'Trigger Flaky Test Runner' UI to trigger flaky test executions";
  echo ""
  echo "    https://ci-stats.kibana.dev/trigger_flaky_test_runner    "
  echo ""
  echo ""
  exit 1
fi
