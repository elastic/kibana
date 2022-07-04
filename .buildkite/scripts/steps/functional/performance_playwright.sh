#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with Playwright config

node scripts/es snapshot&

esPid=$!

# unset env vars defined in other parts of CI for automatic APM collection of
# Kibana. We manage APM config in our FTR config and performance service, and
# APM treats config in the ENV with a very high precedence.
unset ELASTIC_APM_ENVIRONMENT
unset ELASTIC_APM_TRANSACTION_SAMPLE_RATE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_CONTEXT_PROPAGATION_ONLY
unset ELASTIC_APM_ACTIVE
unset ELASTIC_APM_SERVER_URL
unset ELASTIC_APM_SECRET_TOKEN
unset ELASTIC_APM_GLOBAL_LABELS


export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true

# Pings the es server every seconds 2 mins until it is status is green
curl --retry 120 --retry-delay 1 --retry-all-errors -I -XGET "${TEST_ES_URL}/_cluster/health?wait_for_status=green"

journeys=("login" "ecommerce_dashboard" "flight_dashboard" "web_logs_dashboard" "promotion_tracking_dashboard" "many_fields_discover")

for i in "${journeys[@]}"; do
    echo "JOURNEY[${i}] is running"

    export TEST_PERFORMANCE_PHASE=WARMUP
    export JOURNEY_NAME="${i}"

    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Journey:${i},Phase: WARMUP)" \
      node scripts/functional_tests \
        --config "x-pack/test/performance/journeys/${i}/config.ts" \
        --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
        --debug \
        --bail

    export TEST_PERFORMANCE_PHASE=TEST

    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Journey:${i},Phase: TEST)" \
      node scripts/functional_tests \
        --config "x-pack/test/performance/journeys/${i}/config.ts" \
        --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
        --debug \
        --bail
done

kill "$esPid"
