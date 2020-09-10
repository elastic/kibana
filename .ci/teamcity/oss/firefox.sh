#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-firefoxSmoke
export KIBANA_INSTALL_DIR="$KIBANA_DIR/build/kibana-build-oss"

checks-reporter-with-killswitch "Firefox smoke test" \
  node scripts/functional_tests \
    --bail --debug \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "includeFirefox" \
    --config test/functional/config.firefox.js
