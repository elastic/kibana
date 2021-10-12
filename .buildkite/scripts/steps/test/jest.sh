#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest'
checks-reporter-with-killswitch "Jest Unit Tests" \
  node --max-old-space-size=5632 scripts/jest --ci --verbose --runInBand --detectOpenHandles
