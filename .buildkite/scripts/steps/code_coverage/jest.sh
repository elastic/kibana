#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest code coverage'
.buildkite/scripts/steps/code_coverage/jest_parallel.sh jest.config.js

# So the last step "knows" this config ran
uploadRanFile "jest"
