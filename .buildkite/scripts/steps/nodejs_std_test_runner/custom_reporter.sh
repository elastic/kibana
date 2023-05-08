#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh



echo '--- Install Stuff'
# Install nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.39.2/install.sh | bash
# Make nvm command available to terminal
source ~/.nvm/nvm.sh
# Install nodejs v20
nvm install 20.0.0

echo '--- Verify Install'
node --version
npm version

echo '--- New NodeJS Std Test Runner with Custom Reporter'
node --test \
  packages/kbn-test/new_test_runner \
  --test-reporter=packages/kbn-test/new_test_runner/lifecycle_stream.mjs
