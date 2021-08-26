#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- API Integration Tests
checks-reporter-with-killswitch "API Integration Tests" \
  node scripts/functional_tests \
    --config test/api_integration/config.js \
    --bail \
    --debug
