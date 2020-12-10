#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-firefoxSmoke
export KIBANA_INSTALL_DIR="$PARENT_DIR/build/kibana-build-default"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "X-Pack firefox smoke test" \
  node scripts/functional_tests \
    --debug --bail \
    --kibana-install-dir "$KIBANA_INSTALL_DIR" \
    --include-tag "includeFirefox" \
    --config test/functional/config.firefox.js \
    --config test/functional_embedded/config.firefox.ts
