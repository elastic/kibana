#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

source .buildkite/scripts/steps/scalability/util.sh

bootstrap_kibana

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
node scripts/run_scalability --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path "x-pack/platform/test/scalability/apis"

echo "--- Upload test results"
upload_test_results
