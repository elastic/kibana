#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

source .buildkite/scripts/steps/scalability/util.sh

echo "--- yarn kbn bootstrap  --force-install"
if ! yarn kbn bootstrap  --force-install; then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  rm -rf node_modules

  echo "--- yarn kbn reset && yarn kbn bootstrap, attempt 2"
  yarn kbn reset && yarn kbn bootstrap
fi

KIBANA_LOAD_TESTING_DIR="${KIBANA_DIR}/kibana-load-testing"
# These tests are running on static workers so we must delete previous build, load runner and scalability artifacts
rm -rf "${KIBANA_BUILD_LOCATION}"
rm -rf "${KIBANA_LOAD_TESTING_DIR}"

echo "--- Download the build artifacts"
.buildkite/scripts/download_build_artifacts.sh

echo "--- Clone kibana-load-testing repo and compile project"
mkdir -p "${KIBANA_LOAD_TESTING_DIR}" && cd "${KIBANA_LOAD_TESTING_DIR}"
checkout_and_compile_load_runner

echo "--- Run single apis capacity tests"
cd "$KIBANA_DIR"
node scripts/run_scalability --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path "x-pack/test/scalability/apis"

echo "--- Upload test results"
upload_test_results
