#!/bin/bash

set -uo pipefail

ITERATION_COUNT="$(buildkite-agent meta-data get performance-test-iteration-count)"

tput setab 2; tput setaf 0; echo "Performance test will be run at ${BUILDKITE_BRANCH} ${ITERATION_COUNT} times"

cat << EOF | buildkite-agent pipeline upload
steps:
  - command: .buildkite/scripts/steps/functional/performance_sub.sh
    parallelism: "$ITERATION_COUNT"
EOF


