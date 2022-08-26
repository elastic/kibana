#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/apm_parser_performance)"
PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/apm_parser_performance)"
ES_SERVER_URL="https://kibana-ops-e2e-perf.es.us-central1.gcp.cloud.es.io:9243"
BUILD_ID="${BUILDKITE_BUILD_ID}"
GCS_BUCKET="gs://kibana-performance/scalability-tests"
OUTPUT_REL="target/scalability_tests/${BUILD_ID}"
OUTPUT_DIR="${KIBANA_DIR}/${OUTPUT_REL}"

.buildkite/scripts/bootstrap.sh

echo "--- Extract APM metrics"
scalabilityJourneys=("login" "ecommerce_dashboard" "flight_dashboard" "web_logs_dashboard" "promotion_tracking_dashboard" "many_fields_discover")

for i in "${scalabilityJourneys[@]}"; do
    JOURNEY_NAME="${i}"
    echo "Looking for JOURNEY=${JOURNEY_NAME} and BUILD_ID=${BUILD_ID} in APM traces"

    node scripts/extract_performance_testing_dataset \
        --config "x-pack/test/performance/journeys/${i}/config.ts" \ \
        --buildId "${BUILD_ID}" \
        --es-url "${ES_SERVER_URL}" \
        --es-username "${USER_FROM_VAULT}" \
        --es-password "${PASS_FROM_VAULT}" \
        --without-static-resources
done

echo "--- Creating scalability dataset in ${OUTPUT_REL}"
mkdir -p "${OUTPUT_DIR}"

echo "--- Archiving scalability trace and uploading as build artifact"
tar -czf "${OUTPUT_DIR}/scalability_traces.tar.gz" -C target scalability_traces
buildkite-agent artifact upload "${OUTPUT_DIR}/scalability_traces.tar.gz"

echo "--- Downloading Kibana artifacts used in tests"
download_artifact kibana-default.tar.gz "${OUTPUT_DIR}/" --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
download_artifact kibana-default-plugins.tar.gz "${OUTPUT_DIR}/" --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Adding commit info"
echo "${BUILDKITE_COMMIT}" > "${OUTPUT_DIR}/KIBANA_COMMIT_HASH"

echo "--- Uploading ${OUTPUT_REL} dir to ${GCS_BUCKET}"
cd "${OUTPUT_DIR}/.."
gsutil -m cp -r "${BUILD_ID}" "${GCS_BUCKET}"
cd -

echo "--- Promoting '${BUILD_ID}' dataset to LATEST"
cd "${OUTPUT_DIR}/.."
echo "${BUILD_ID}" > LATEST
gsutil cp LATEST "${GCS_BUCKET}"
cd -
