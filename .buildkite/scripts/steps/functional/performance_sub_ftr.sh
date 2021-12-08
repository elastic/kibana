#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

echo --- Run Performance Tests with FTR config

node scripts/es snapshot&

esPid=$!

export TEST_ES_URL=http://elastic:changeme@localhost:9200
export DONT_START_ES=true
export DISABLE_APM=true

sleep 120

cd "$XPACK_DIR"

# warmup round 1
checks-reporter-with-killswitch "Run Performance Tests (warmup 1)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/performance/config.ftr.ts;

# warmup round 2
checks-reporter-with-killswitch "Run Performance Tests (warmup 2)" \
   node scripts/functional_tests \
     --debug --bail \
     --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
     --config test/performance/config.ftr.ts;

export DISABLE_APM=false

checks-reporter-with-killswitch "Run Performance Tests" \
   node scripts/functional_tests \
     --debug --bail \
     --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
     --config test/performance/config.ftr.ts;

kill "$esPid"
