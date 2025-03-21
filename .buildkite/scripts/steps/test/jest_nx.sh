#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest (with NX)'
.buildkite/scripts/steps/test/jest_nx_parallel.sh jest.config.js
