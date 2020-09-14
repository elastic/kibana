#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-accessibility
export KIBANA_INSTALL_DIR="$KIBANA_DIR/build/kibana-build-default"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack accessibility tests" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --config test/accessibility/config.ts
