#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh

cd "$XPACK_DIR"

echo --- Run Performance Tests with FTR config

node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.50.1 \
  -E discovery.type=single-node \
  --license=trial &

esPid=$!

export TEST_KIBANA_URL=http://elastic:changeme@192.168.50.5:5601
export TEST_ES_URL=http://elastic:changeme@192.168.50.1:9200

# warmup round 1
DONT_START_ES=true DISABLE_APM=true checks-reporter-with-killswitch "Run Performance Tests (warmup 1)" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config test/performance/config.ftr.ts;

# warmup round 2
DONT_START_ES=true DISABLE_APM=true checks-reporter-with-killswitch "Run Performance Tests (warmup 2)" \
   node scripts/functional_tests \
     --debug --bail \
     --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
     --config test/performance/config.ftr.ts;

DONT_START_ES=true DISABLE_APM=false checks-reporter-with-killswitch "Run Performance Tests" \
   node scripts/functional_tests \
     --debug --bail \
     --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
     --config test/performance/config.ftr.ts;

kill "$esPid"
