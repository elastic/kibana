#!/usr/bin/env bash

boot() {
  .buildkite/scripts/bootstrap.sh
}
install() {
  echo '--- Install Stuff'
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.39.2/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install v20.0.0

  echo '--- Verify Install'
  node --version
  npm --version
}
TGT=${TGT:-../../../../target/junit/nodejs_internal_test_runner}
shutdown() {
  exit_code=$?
  echo "### Runner - Exit Code: ${exit_code}"

  #  exit $exit_code
}
unusedExamples() {
  #  node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$TGT"
  #  node --test-reporter=./lifecycle_stream.mjs --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$TGT"
  #  node --test-reporter spec --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$TGT"
  #  node --test-reporter spec --test
  true
}
testAndReport() {
  echo '--- Run the Test Runner and Report'

  trap "shutdown" EXIT

#  set -x
  echo "### Clean ${TGT}"
  rm -rf "${TGT}"

  echo '### Move to Dir'
  pushd packages/kbn-test/new_test_runner/test >/dev/null

  echo '--- New NodeJS Std Test Runner, Report to Screen, w/ CustomReporter Generator Fn'
  node --test-reporter=../lifecycle_gen.mjs --test

  echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
  node --test | ../../../../node_modules/tap-junit/bin/tap-junit --output "${TGT}"

  echo '### Move back to root dir'
  popd >/dev/null

  echo '--- Junit Xml to JSON'
  npx junit2json target/junit/nodejs_internal_test_runner/tap.xml | jq

#  set +x
}
upload() {
  buildkite-agent artifact upload "target/junit/*.xml"
}

while getopts b:i:r:u: flag; do
  case "${flag}" in
  b) boot=${OPTARG} ;;
  i) install=${OPTARG} ;;
  r) report=${OPTARG} ;;
  u) upload=${OPTARG} ;;
  *) ;;
  esac
done

if [ "${boot}" == "true" ]; then boot; fi
if [ "${install}" == "true" ]; then install; fi
if [ "${report}" == "true" ]; then testAndReport; fi
if [ "${upload}" == "true" ]; then upload; fi
