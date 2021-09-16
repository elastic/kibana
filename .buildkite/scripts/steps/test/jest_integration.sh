#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest Integration Tests'
checks-reporter-with-killswitch "Jest Integration Tests" \
  node scripts/jest_integration --ci --verbose
