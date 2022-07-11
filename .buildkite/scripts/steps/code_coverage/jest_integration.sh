#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

JOB=${BUILDKITE_PARALLEL_JOB:-0}

echo '--- Jest Integration code coverage'
.buildkite/scripts/steps/code_coverage/jest_parallel.sh jest.integration.config.js

# So the last step "knows" this config ran
uploadRanFile "jest"
