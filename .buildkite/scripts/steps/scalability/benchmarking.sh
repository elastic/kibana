#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

#.buildkite/scripts/bootstrap.sh
echo "--- yarn kbn reset && yarn kbn bootstrap"
yarn kbn reset && yarn kbn bootstrap

GCS_BUCKET_DATA="gs://kibana-performance/scalability-tests"
GSC_BUCKET_RESULTS="gs://kibana-performance/scalability-test-results"
GCS_ARTIFACTS_REL="gcs_artifacts"
GCS_ARTIFACTS_DIR="${WORKSPACE}/${GCS_ARTIFACTS_REL}"
KIBANA_LOAD_TESTING_DIR="${KIBANA_DIR}/kibana-load-testing"
TEST_RESULTS_ARCHIVE_NAME="scalability_test_report.tar.gz"
BUILD_ID="${BUILDKITE_BUILD_ID}"

# These tests are running on static workers so we must delete previous build, load runner and scalability artifacts
rm -rf "${KIBANA_BUILD_LOCATION}"
rm -rf "${KIBANA_LOAD_TESTING_DIR}"
rm -rf "${GCS_ARTIFACTS_DIR}"

download_artifacts() {
  mkdir -p "${GCS_ARTIFACTS_DIR}"

  gsutil cp "${GCS_BUCKET_DATA}/latest" "${GCS_ARTIFACTS_DIR}/"
  export KIBANA_BUILD_HASH=`cat ${GCS_ARTIFACTS_DIR}/latest`
  gsutil cp -r "${GCS_BUCKET_DATA}/${KIBANA_BUILD_HASH}" "${GCS_ARTIFACTS_DIR}/"

  export LATEST_RUN_ARTIFACTS_DIR="${GCS_ARTIFACTS_DIR}/${HASH}"

  echo "Unzip kibana build, plugins and scalability traces"
  cd "${WORKSPACE}"
  mkdir -p "${KIBANA_BUILD_LOCATION}"
  tar -xzf "${LATEST_RUN_ARTIFACTS_DIR}/kibana-default.tar.gz" -C "${KIBANA_BUILD_LOCATION}" --strip=1

  cd "${KIBANA_DIR}"
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
  echo "--- Archive Gatling reports and upload as build artifacts"
  tar -czf "${TEST_RESULTS_ARCHIVE_NAME}" --exclude=simulation.log -C kibana-load-testing/target gatling
  buildkite-agent artifact upload "${TEST_RESULTS_ARCHIVE_NAME}"

  echo "--- Upload Gatling reports and metadata to GCS"
  RESULTS_ROOT_FOLDER="$(date +"%d-%m-%Y-%H:%M:%S")"
  mkdir "${RESULTS_ROOT_FOLDER}"
  cp "${TEST_RESULTS_ARCHIVE_NAME}" "${RESULTS_ROOT_FOLDER}"
  cat <<< "BUILD_ID=${BUILD_ID}" > "${RESULTS_ROOT_FOLDER}/meta.log"
  cat <<< "KIBANA_LOAD_TESTING_GIT_COMMIT=${KIBANA_LOAD_TESTING_GIT_COMMIT}" >> "${RESULTS_ROOT_FOLDER}/meta.log"
  cat <<< "KIBANA_BUILD_HASH=${KIBANA_BUILD_HASH}" >> "${RESULTS_ROOT_FOLDER}/meta.log"
  gsutil -m cp -r "${RESULTS_ROOT_FOLDER}" "${GSC_BUCKET_RESULTS}"

  cd "${LATEST_RUN_ARTIFACTS_DIR}"
  echo "Upload scalability traces as build artifacts"
  buildkite-agent artifact upload "scalability_traces.tar.gz"
}

echo "--- Download the latest artifacts from single user performance pipeline"
download_artifacts

echo "--- Clone kibana-load-testing repo and compile project"
checkout_and_compile_load_runner

echo "--- Run Scalability Tests with Elasticsearch started only once and Kibana restart before each journey"
cd "$KIBANA_DIR"
node scripts/es snapshot&

esPid=$!
# Set trap on EXIT to stop Elasticsearch process
trap "kill -9 $esPid" EXIT

# unset env vars defined in other parts of CI for automatic APM collection of
# Kibana. We manage APM config in our FTR config and performance service, and
# APM treats config in the ENV with a very high precedence.
unset ELASTIC_APM_ENVIRONMENT
unset ELASTIC_APM_TRANSACTION_SAMPLE_RATE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_CONTEXT_PROPAGATION_ONLY
unset ELASTIC_APM_GLOBAL_LABELS
unset ELASTIC_APM_MAX_QUEUE_SIZE
unset ELASTIC_APM_METRICS_INTERVAL
unset ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES
unset ELASTIC_APM_BREAKDOWN_METRICS


export TEST_ES_DISABLE_STARTUP=true
ES_HOST="localhost:9200"
export TEST_ES_URL="http://elastic:changeme@${ES_HOST}"
# Overriding Gatling default configuration
export ES_URL="http://${ES_HOST}"

# Pings the ES server every second for 2 mins until its status is green
curl --retry 120 \
  --retry-delay 1 \
  --retry-connrefused \
  -I -XGET "${TEST_ES_URL}/_cluster/health?wait_for_nodes=>=1&wait_for_status=yellow"

export ELASTIC_APM_ACTIVE=true

for journey in scalability_traces/server/*; do
    export SCALABILITY_JOURNEY_PATH="$KIBANA_DIR/$journey"
    echo "--- Run scalability file: $SCALABILITY_JOURNEY_PATH"
    node scripts/functional_tests \
      --config x-pack/test/performance/scalability/config.ts \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --debug
done

echo "--- Upload test results"
upload_test_results
