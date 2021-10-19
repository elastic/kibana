#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-uptime-playwright

echo "--- Uptime @elastic/synthetics Tests"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Uptime @elastic/synthetics Tests" \
  node plugins/uptime/scripts/e2e.js
