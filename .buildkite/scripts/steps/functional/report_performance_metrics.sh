#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# TODO: Add new user and change lines accordingly
USER_FROM_VAULT="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/apm_parser_performance)"
PASS_FROM_VAULT="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/apm_parser_performance)"
APM_SERVER_URL="https://kibana-ops-e2e-perf.es.us-central1.gcp.cloud.es.io:9243/internal/apm"
BUILD_ID=${BUILDKITE_BUILD_ID}

.buildkite/scripts/bootstrap.sh

echo "--- Extract APM metrics & report them to ci-stats"

node scripts/report_performance_metrics \
    --buildId "${BUILD_ID}" \
    --apm-url "${APM_SERVER_URL}" \
    --apm-username "${USER_FROM_VAULT}" \
    --apm-password "${PASS_FROM_VAULT}"
