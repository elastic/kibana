#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-server-integration
export KIBANA_INSTALL_DIR="$PARENT_DIR/build/kibana-build-oss"

checks-reporter-with-killswitch "Server integration tests" \
  node scripts/functional_tests \
    --config test/server_integration/http/ssl/config.js \
    --config test/server_integration/http/ssl_redirect/config.js \
    --config test/server_integration/http/platform/config.ts \
    --config test/server_integration/http/ssl_with_p12/config.js \
    --config test/server_integration/http/ssl_with_p12_intermediate/config.js \
    --bail \
    --debug \
    --kibana-install-dir $KIBANA_INSTALL_DIR
