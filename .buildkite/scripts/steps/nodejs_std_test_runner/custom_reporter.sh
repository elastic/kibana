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
npm --version

# echo '--- New NodeJS Std Test Runner with Custom Reporter [Transform Stream]'
# pushd packages/kbn-test/new_test_runner
# node --test-reporter=./lifecycle_stream.mjs --test
# popd

echo '--- New NodeJS Std Test Runner with Custom Reporter [Generator Fn]'
pushd packages/kbn-test/new_test_runner
node --test-reporter=./lifecycle_gen.mjs --test
popd

echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
pushd packages/kbn-test/new_test_runner
tgt="../../../target/junit"
ls -R "$tgt"
node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$tgt"
ls -R "$tgt"
popd

#target/junit
