#!/usr/bin/env bash

set -e

###
### skip chomium download, use the system chrome install
###
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH="$(command -v google-chrome-stable)"
export PUPPETEER_EXECUTABLE_PATH

###
### Set Percy parallel build support environment vars
###
eval "$(node ./src/dev/ci_setup/get_percy_env)"
echo " -- PERCY_PARALLEL_NONCE='$PERCY_PARALLEL_NONCE'"
echo " -- PERCY_PARALLEL_TOTAL='$PERCY_PARALLEL_TOTAL'"
echo " -- PERCY_BRANCH='$PERCY_BRANCH'"
echo " -- PERCY_TARGET_BRANCH='$PERCY_TARGET_BRANCH'"
