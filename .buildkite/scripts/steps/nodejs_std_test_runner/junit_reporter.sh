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
TGT=${TGT:-"../../../target/junit"}
shutdown() {
  exit_code=$?
  echo "### Runner - Exit Code: ${exit_code}"

  #  exit $exit_code
}
testAndReport() {
  trap "shutdown" EXIT

  echo '--- New NodeJS Std Test Runner using Tap-Junit reporter'
  pushd packages/kbn-test/new_test_runner >/dev/null

  node --test-reporter tap --test ./ | ../../../node_modules/tap-junit/bin/tap-junit --output "$TGT"
  popd >/dev/null

  echo '--- Junit Xml to JSON'
  npx junit2json target/junit/tap.xml | jq
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
echo "### install: ${install}"
echo "### report: ${report}"

if [ "${boot}" == "true" ]; then boot; fi
if [ "${install}" == "true" ]; then install; fi
if [ "${report}" == "true" ]; then testAndReport; fi
if [ "${upload}" == "true" ]; then upload; fi
