#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

source .buildkite/scripts/steps/scalability/util.sh

bootstrap_kibana

GCS_BUCKET="gs://kibana-performance/scalability-tests"
GCS_ARTIFACTS_REL="gcs_artifacts"
GCS_ARTIFACTS_DIR="${WORKSPACE}/${GCS_ARTIFACTS_REL}"
KIBANA_LOAD_TESTING_DIR="${KIBANA_DIR}/kibana-load-testing"

# These tests are running on static workers so we must delete previous build, load runner and scalability artifacts
rm -rf "${KIBANA_BUILD_LOCATION}"
rm -rf "${KIBANA_LOAD_TESTING_DIR}"
rm -rf "${GCS_ARTIFACTS_DIR}"

download_artifacts() {
  echo Activating service-account for gsutil to access gs://kibana-performance
  .buildkite/scripts/common/activate_service_account.sh gs://kibana-performance

  mkdir -p "${GCS_ARTIFACTS_DIR}"

  gsutil cp "$GCS_BUCKET/latest" "${GCS_ARTIFACTS_DIR}/"
  HASH=`cat ${GCS_ARTIFACTS_DIR}/latest`
  gsutil cp -r "$GCS_BUCKET/$HASH" "${GCS_ARTIFACTS_DIR}/"

  export LATEST_RUN_ARTIFACTS_DIR="${GCS_ARTIFACTS_DIR}/${HASH}"

  echo "Unzip kibana build, plugins and scalability traces"
  cd "$WORKSPACE"
  mkdir -p "$KIBANA_BUILD_LOCATION"
  tar -xzf "${LATEST_RUN_ARTIFACTS_DIR}/kibana-default.tar.gz" -C "$KIBANA_BUILD_LOCATION" --strip=1

  cd "$KIBANA_DIR"
  tar -xzf "${LATEST_RUN_ARTIFACTS_DIR}/kibana-default-plugins.tar.gz"
  tar -xzf "${LATEST_RUN_ARTIFACTS_DIR}/scalability_traces.tar.gz"
}

echo "--- Clone kibana-load-testing repo and compile project"
mkdir -p "${KIBANA_LOAD_TESTING_DIR}" && cd "${KIBANA_LOAD_TESTING_DIR}"
checkout_and_compile_load_runner

cd "$KIBANA_DIR"
echo "--- Download the latest artifacts from single user performance pipeline"
download_artifacts

echo "--- Run journey scalability tests"
node scripts/run_scalability --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path "scalability_traces/server"

echo "--- Upload test results"
upload_test_results

cd "${LATEST_RUN_ARTIFACTS_DIR}"
echo "Upload scalability traces as build artifacts"
buildkite-agent artifact upload "scalability_traces.tar.gz"
