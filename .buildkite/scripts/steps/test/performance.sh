#!/bin/bash

set -uo pipefail

ITERATION_COUNT=`echo "$(buildkite-agent meta-data get performance-test-iteration-count)" | xargs`
TARGET_BRANCH=`echo "$(buildkite-agent meta-data get performance-test-target-branch)" | xargs`

tput setab 2; tput setaf 0; echo "Performance test will be run at ${TARGET_BRANCH} ${ITERATION_COUNT} times"

cat << EOF | buildkite-agent pipeline upload
steps:
  - command: "git checkout $TARGET_BRANCH && git fetch && cd x-pack && yarn install && yarn test:jest"
    parallelism: "$ITERATION_COUNT"
EOF
