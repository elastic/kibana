#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- New NodeJS Std Test Runner'
node --test packages/kbn-test/new_test_runner
