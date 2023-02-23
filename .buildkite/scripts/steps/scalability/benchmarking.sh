#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

#.buildkite/scripts/bootstrap.sh
echo "--- yarn kbn reset && yarn kbn bootstrap"
yarn kbn reset && yarn kbn bootstrap

GCS_BUCKET="gs://kibana-performance/scalability-tests"
GCS_ARTIFACTS_REL="gcs_artifacts"
GCS_ARTIFACTS_DIR="${WORKSPACE}/${GCS_ARTIFACTS_REL}"
KIBANA_LOAD_TESTING_DIR="${KIBANA_DIR}/kibana-load-testing"

# These tests are running on static workers so we must delete previous build, load runner and scalability artifacts
rm -rf "${KIBANA_BUILD_LOCATION}"
rm -rf "${KIBANA_LOAD_TESTING_DIR}"
rm -rf "${GCS_ARTIFACTS_DIR}"

download_artifacts() {
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

checkout_and_compile_load_runner() {
  mkdir -p "${KIBANA_LOAD_TESTING_DIR}" && cd "${KIBANA_LOAD_TESTING_DIR}"

  if [[ ! -d .git ]]; then
    git init
    git remote add origin https://github.com/elastic/kibana-load-testing.git
  fi
  git fetch origin --depth 1 "main"
  git reset --hard FETCH_HEAD

  KIBANA_LOAD_TESTING_GIT_COMMIT="$(git rev-parse HEAD)"
  export KIBANA_LOAD_TESTING_GIT_COMMIT

  mvn -q test-compile
  echo "Set 'GATLING_PROJECT_PATH' env var for ScalabilityTestRunner"
  export GATLING_PROJECT_PATH="$(pwd)"
}

upload_test_results() {
  cd "${KIBANA_DIR}"
  echo "Upload server logs as build artifacts"
  tar -czf server-logs.tar.gz data/ftr_servers_logs/**/*
  buildkite-agent artifact upload server-logs.tar.gz
  echo "--- Upload Gatling reports as build artifacts"
  tar -czf "scalability_test_report.tar.gz" --exclude=simulation.log -C kibana-load-testing/target gatling
  buildkite-agent artifact upload "scalability_test_report.tar.gz"
  cd "${LATEST_RUN_ARTIFACTS_DIR}"
  echo "Upload scalability traces as build artifacts"
  buildkite-agent artifact upload "scalability_traces.tar.gz"
}

echo "--- Clone kibana-load-testing repo and compile project"
checkout_and_compile_load_runner

cd "$KIBANA_DIR"
echo "--- Download the latest artifacts from single user performance pipeline"
download_artifacts

if [ "$BUILDKITE_PIPELINE_SLUG" == "kibana-scalability-benchmarking-1" ]; then
  echo "--- Run journey scalability tests"
  node scripts/run_scalability --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path "scalability_traces/server"
else
  echo "--- Run single apis capacity tests"
  node scripts/run_scalability --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path "x-pack/test/scalability/apis"
fi

echo "--- Upload test results"
upload_test_results
