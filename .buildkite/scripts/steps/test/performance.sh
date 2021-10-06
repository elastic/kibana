#!/bin/bash

set -uo pipefail

ITERATION_COUNT=echo "$(buildkite-agent meta-data get performance-test-iteration-count)" | xargs
TARGET_BRANCH=echo "$(buildkite-agent meta-data get performance-test-target-branch)" | xargs

echo "Performance test will be run at ${TARGET_BRANCH} ${ITERATION_COUNT} times"
