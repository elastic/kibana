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

./test/scripts/test/plugin_functional.sh
./test/scripts/test/example_functional.sh
./test/scripts/test/interpreter_functional.sh
