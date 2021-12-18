#!/bin/bash

set -uo pipefail

if [ -z "${ITERATION_COUNT_ENV+x}" ]; then
  ITERATION_COUNT="$(buildkite-agent meta-data get performance-test-iteration-count)"
else
  ITERATION_COUNT=$ITERATION_COUNT_ENV
fi

tput setab 2; tput setaf 0; echo "Performance test will be run at ${BUILDKITE_BRANCH} ${ITERATION_COUNT} times"

cat << EOF | buildkite-agent pipeline upload
steps:
  - command: .buildkite/scripts/steps/functional/performance_sub.sh
    parallelism: "$ITERATION_COUNT"
    concurrency: 20
    concurrency_group: 'performance-test-group'
EOF



