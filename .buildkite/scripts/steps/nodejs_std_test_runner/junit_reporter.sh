#!/usr/bin/env bash

set -euo pipefail

#source .buildkite/scripts/common/util.sh
#
#is_test_execution_step
#
.buildkite/scripts/bootstrap.sh

install() {
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.39.2/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install 20.0.0

  echo '--- Verify Install'
  node --version
  npm --version
}
echo '--- Install Stuff'
install

# echo '--- New NodeJS Std Test Runner with Custom Reporter [Transform Stream]'
# pushd packages/kbn-test/new_test_runner
# node --test-reporter=./lifecycle_stream.mjs --test
# popd

junitReport() {
  pushd packages/kbn-test/new_test_runner
  tgt="../../../target/junit"
  node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$tgt"
  ls -R "$tgt"
  popd
  npx junit2json target/junit/tap.xml | jq
}
echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
junitReport

#shutdown() {
#  exit_code=$?
#  echo "### exit_code: ${exit_code}"
#
#  echo "### tgt: ${tgt}"
#  echo "### Contents of ${tgt}:"
#  ls -la "$tgt"
#
#  # exit $exit_code
#}
#trap "shutdown" EXIT

