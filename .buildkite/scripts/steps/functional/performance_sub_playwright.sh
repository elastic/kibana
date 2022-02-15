#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with Playwright config

node scripts/es snapshot&

esPid=$!

export TEST_PERFORMANCE_PHASE=WARMUP
export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true
export ELASTIC_APM_ACTIVE=false

sleep 120

cd "$XPACK_DIR"

journeys=("login" "ecommerce_dashboard" "flight_dashboard" "web_logs_dashboard" "promotion_tracking_dashboard")

for i in "${journeys[@]}"; do
    export JOURNEY_NAME="${i}"
    export TEST_PERFORMANCE_PHASE=WARMUP
    export ELASTIC_APM_ACTIVE=false
    
    # warmup round 1
    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Phase: WARMUP)" \
      node scripts/functional_tests \
        --debug --bail \
        --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
        --config "test/performance/config.playwright.ts";

    export TEST_PERFORMANCE_PHASE=TEST
    export ELASTIC_APM_ACTIVE=true

    echo "JOURNEY[${JOURNEY_NAME}] is running"
    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Phase: TEST)" \
      node scripts/functional_tests \
      --debug --bail \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --config "test/performance/config.playwright.ts";
done

kill "$esPid"
