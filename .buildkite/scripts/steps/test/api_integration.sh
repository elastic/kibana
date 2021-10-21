#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184718as7hd89a7dhas98d6.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

.buildkite/scripts/bootstrap.sh

echo --- API Integration Tests
checks-reporter-with-killswitch "API Integration Tests" \
  node scripts/functional_tests \
    --config test/api_integration/config.js \
    --bail \
    --debug
