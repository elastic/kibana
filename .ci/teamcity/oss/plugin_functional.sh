#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-oss-pluginFunctional
export KIBANA_INSTALL_DIR="$PARENT_DIR/build/kibana-build-oss"

cd test/plugin_functional/plugins/kbn_sample_panel_action
if [[ ! -d "target" ]]; then
  yarn build
fi
cd -

checks-reporter-with-killswitch "Plugin Functional Tests" \
  node scripts/functional_tests \
    --config test/plugin_functional/config.ts \
    --bail \
    --debug

checks-reporter-with-killswitch "Example Functional Tests" \
  node scripts/functional_tests \
    --config test/examples/config.js \
    --bail \
    --debug

checks-reporter-with-killswitch "Interpreter Functional Tests" \
  node scripts/functional_tests \
    --config test/interpreter_functional/config.ts \
    --bail \
    --debug \
    --kibana-install-dir "$KIBANA_INSTALL_DIR"
