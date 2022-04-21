#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/apm_parser_performance)"
PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/apm_parser_performance)"
ES_SERVER_URL="https://kibana-ops-e2e-perf.es.us-central1.gcp.cloud.es.io:9243"
BUILD_ID=${BUILDKITE_BUILD_ID}

.buildkite/scripts/bootstrap.sh

echo "--- Extract APM metrics"
journeys=("login" "ecommerce_dashboard" "flight_dashboard" "web_logs_dashboard" "promotion_tracking_dashboard" "many_fields_discover")

for i in "${journeys[@]}"; do
    JOURNEY_NAME="${i}"
    echo "Looking for JOURNEY=${JOURNEY_NAME} and BUILD_ID=${BUILD_ID} in APM traces"

    ./node_modules/.bin/performance-testing-dataset-extractor -u "${USER_FROM_VAULT}" -p "${PASS_FROM_VAULT}" -c "${ES_SERVER_URL}" -s "2022-04-12T00:01:00.000Z" -j "${BUILD_ID}" -n "${JOURNEY_NAME}"
done

# archive json files with traces and upload as build artifacts
echo "--- Archive jsons and upload as artefact"
tar -czf target/performance/scalability_traces.tar.gz output
buildkite-agent artifact upload "target/performance/scalability_traces.tar.gz"

