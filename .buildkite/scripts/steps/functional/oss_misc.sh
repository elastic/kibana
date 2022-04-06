#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

# Required, at least for plugin_functional tests
.buildkite/scripts/build_kibana_plugins.sh

echo --- Plugin Functional Tests
checks-reporter-with-killswitch "Plugin Functional Tests" \
  node scripts/functional_tests \
    --config test/plugin_functional/config.ts \
    --bail \
    --debug

echo --- Interpreter Functional Tests
checks-reporter-with-killswitch "Interpreter Functional Tests" \
  node scripts/functional_tests \
    --config test/interpreter_functional/config.ts \
    --bail \
    --debug \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo --- Server Integration Tests
checks-reporter-with-killswitch "Server Integration Tests" \
  node scripts/functional_tests \
    --config test/server_integration/http/ssl/config.js \
    --config test/server_integration/http/ssl_redirect/config.js \
    --config test/server_integration/http/platform/config.ts \
    --config test/server_integration/http/ssl_with_p12/config.js \
    --config test/server_integration/http/ssl_with_p12_intermediate/config.js \
    --bail \
    --debug \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION"

# Tests that must be run against source in order to build test plugins
echo --- Status Integration Tests
checks-reporter-with-killswitch "Status Integration Tests" \
  node scripts/functional_tests \
    --config test/server_integration/http/platform/config.status.ts \
    --bail \
    --debug

# Tests that must be run against source in order to build test plugins
echo --- Analytics Integration Tests
checks-reporter-with-killswitch "Analytics Integration Tests" \
  node scripts/functional_tests \
    --config test/analytics/config.ts \
    --bail \
    --debug
