#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh




echo '--- New NodeJS Std Test Runner with Custom Reporter'
nvm install 20.0.0
node --test \
  packages/kbn-test/new_test_runner \
  --test-reporter=packages/kbn-test/new_test_runner/lifecycle_stream.mjs
