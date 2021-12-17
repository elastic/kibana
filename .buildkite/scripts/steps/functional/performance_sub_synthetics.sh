#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with Synthetics config

node scripts/es snapshot&

esPid=$!

export PERFORMANCE_PHASE=WARMUP
export TEST_ES_URL=http://elastic:changeme@localhost:9200
export DONT_START_ES=true
export DISABLE_APM=true

sleep 120

cd "$XPACK_DIR"

# warmup round 1
checks-reporter-with-killswitch "Run Performance Tests with Synthetics Config (Phase: WARMUP_1)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/performance/config.synthetics.ts";

# warmup round 2
checks-reporter-with-killswitch "Run Performance Tests with Synthetics Config (Phase: WARMUP_2)" \
   node scripts/functional_tests \
     --debug --bail \
     --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
     --config "test/performance/config.synthetics.ts";

export DISABLE_APM=false
export PERFORMANCE_PHASE=TEST

checks-reporter-with-killswitch "Run Performance Tests with Synthetics Config (Phase: TEST)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config "test/performance/config.synthetics.ts";

kill "$esPid"
