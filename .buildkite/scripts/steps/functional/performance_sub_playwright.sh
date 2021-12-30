#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with Playwright config

node scripts/es snapshot&

esPid=$!

export PERF_TEST_PHASE=WARMUP
export TEST_ES_URL=http://elastic:changeme@localhost:9200
export DONT_START_ES=true
export DISABLE_APM=true

sleep 120

cd "$XPACK_DIR"

# warmup round 1
checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Phase: WARMUP)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/performance/config.playwright.ts";

export DISABLE_APM=false
export PERF_TEST_PHASE=TEST

checks-reporter-with-killswitch "Run Performance Tests with Playwright Config (Phase: TEST)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/performance/config.playwright.ts";

kill "$esPid"
