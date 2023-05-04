#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest Integration Tests'
.buildkite/scripts/steps/test/jest_parallel.sh jest.integration.config.js
