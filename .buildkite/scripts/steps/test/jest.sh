#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest'
checks-reporter-with-killswitch "Jest Unit Tests" \
  node --expose-gc scripts/jest --ci --verbose --maxWorkers=10 --logHeapUsage
