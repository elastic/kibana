#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with Playwright config

node scripts/es snapshot&

esPid=$!

export TEST_ES_URL=http://elastic:changeme@localhost:9200
export TEST_ES_DISABLE_STARTUP=true

sleep 120

cd "$XPACK_DIR"

journeys=("ecommerce_dashboard" "flight_dashboard" "web_logs_dashboard" "promotion_tracking_dashboard")

for i in "${journeys[@]}"; do
    echo "JOURNEY[${i}] is running"

    export TEST_PERFORMANCE_PHASE=WARMUP
    export ELASTIC_APM_ACTIVE=false
    export JOURNEY_NAME="${i}"
    
    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Journey:${i},Phase: WARMUP)" \
      node scripts/functional_tests \
      --config test/performance/config.playwright.ts \
      --include "test/performance/tests/playwright/${i}.ts" \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --debug \
      --bail

    export TEST_PERFORMANCE_PHASE=TEST
    export ELASTIC_APM_ACTIVE=true

    checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Journey:${i},Phase: TEST)" \
      node scripts/functional_tests \
      --config test/performance/config.playwright.ts \
      --include "test/performance/tests/playwright/${i}.ts" \
      --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
      --debug \
      --bail
done

kill "$esPid"
