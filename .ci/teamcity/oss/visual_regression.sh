#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

tc_start_block "OSS Visual Regression"

export JOB=oss-visualRegression
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH="$(command -v google-chrome-stable)"
export PUPPETEER_EXECUTABLE_PATH
export KIBANA_INSTALL_DIR="$KIBANA_DIR/build/kibana-build-oss"

###
### Set Percy parallel build support environment vars
###
eval "$(node "$KIBANA_DIR/src/dev/ci_setup/get_percy_env")"
echo " -- PERCY_PARALLEL_NONCE='$PERCY_PARALLEL_NONCE'"
echo " -- PERCY_PARALLEL_TOTAL='$PERCY_PARALLEL_TOTAL'"
echo " -- PERCY_BRANCH='$PERCY_BRANCH'"
echo " -- PERCY_TARGET_BRANCH='$PERCY_TARGET_BRANCH'"

yarn percy exec -t 10000 -- -- node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --config test/visual_regression/config.ts;

tc_end_block "OSS Visual Regression"
