#!/bin/bash

set -uo pipefail

if [[ $ITERATION_COUNT_ENV -gt 0 ]]
then
  ITERATION_COUNT=$ITERATION_COUNT_ENV
else
  ITERATION_COUNT="$(buildkite-agent meta-data get performance-test-iteration-count)"
fi

tput setab 2; tput setaf 0; echo "Performance test will be run at ${BUILDKITE_BRANCH} ${ITERATION_COUNT} times"

cat << EOF | buildkite-agent pipeline upload
steps:
  - command: .buildkite/scripts/steps/functional/performance_sub.sh
    parallelism: "$ITERATION_COUNT"
EOF



