#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/util.sh"

tc_start_block "OSS Visual Regression"

export CI_PARALLEL_PROCESS_NUMBER=1
export JOB=oss-visualRegression
export CI=true
export GCS_UPLOAD_PREFIX=ehwihsihfiashdhfshfso

mv /home/agent/work/kibana-build-oss/kibana-8.0.0-SNAPSHOT-linux-x86_64/* /home/agent/work/kibana-build-oss/

export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH="$(command -v google-chrome-stable)"
export PUPPETEER_EXECUTABLE_PATH

###
### Set Percy parallel build support environment vars
###
eval "$(node $KIBANA_DIR/src/dev/ci_setup/get_percy_env)"
echo " -- PERCY_PARALLEL_NONCE='$PERCY_PARALLEL_NONCE'"
echo " -- PERCY_PARALLEL_TOTAL='$PERCY_PARALLEL_TOTAL'"
echo " -- PERCY_BRANCH='$PERCY_BRANCH'"
echo " -- PERCY_TARGET_BRANCH='$PERCY_TARGET_BRANCH'"

yarn percy exec -t 10000 -- -- node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "/home/agent/work/kibana-build-oss/" \
  --config test/visual_regression/config.ts;

tc_end_block "OSS Visual Regression"
