#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/apm_parser_performance)"
PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/apm_parser_performance)"
ES_SERVER_URL="https://kibana-ops-e2e-perf.es.us-central1.gcp.cloud.es.io:9243"
BUILD_ID=${BUILDKITE_BUILD_ID}
GCS_BUCKET="gs://kibana-performance/scalability-tests"

.buildkite/scripts/bootstrap.sh

echo "--- Extract APM metrics"
scalabilityJourneys=("login" "promotion_tracking_dashboard")

for i in "${scalabilityJourneys[@]}"; do
    JOURNEY_NAME="${i}"
    echo "Looking for JOURNEY=${JOURNEY_NAME} and BUILD_ID=${BUILD_ID} in APM traces"

    node scripts/extract_performance_testing_dataset \
        --config "x-pack/test/performance/journeys/${i}/config.ts" \ \
        --buildId "${BUILD_ID}" \
        --es-url "${ES_SERVER_URL}" \
        --es-username "${USER_FROM_VAULT}" \
        --es-password "${PASS_FROM_VAULT}"
done

echo "--- Upload Kibana build, plugins and scalability traces to the public bucket"
mkdir "${BUILD_ID}"
# Archive json files with traces and upload as build artifacts
tar -czf "${BUILD_ID}/scalability_traces.tar.gz" -C target scalability_traces
buildkite-agent artifact upload "${BUILD_ID}/scalability_traces.tar.gz"
# Upload Kibana build, plugins, commit sha and traces to the bucket
buildkite-agent artifact download kibana-default.tar.gz ./"${BUILD_ID}"
buildkite-agent artifact download kibana-default-plugins.tar.gz ./"${BUILD_ID}"
echo "${BUILDKITE_COMMIT}" > "${BUILD_ID}/KIBANA_COMMIT_HASH"
gsutil -m cp -r "${BUILD_ID}" "${GCS_BUCKET}"
echo "--- Update reference to the latest CI build"
echo "${BUILD_ID}" > LATEST
gsutil cp LATEST "${GCS_BUCKET}"
