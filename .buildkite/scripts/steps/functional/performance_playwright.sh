#!/bin/bash

set -uo pipefail

if [ -z "${PERF_TEST_COUNT+x}" ]; then
  TEST_COUNT="$(buildkite-agent meta-data get performance-test-iteration-count)"
else
  TEST_COUNT=$PERF_TEST_COUNT
fi

tput setab 2; tput setaf 0; echo "Performance test will be run at ${BUILDKITE_BRANCH} ${TEST_COUNT} times"

cat << EOF | buildkite-agent pipeline upload
steps:
  - command: .buildkite/scripts/steps/functional/performance_sub_playwright.sh
    parallelism: "$TEST_COUNT"
    concurrency: 20
    concurrency_group: 'performance-test-group'
    agents:
      queue: c2-16
EOF



