#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

tc_start_block "Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --filter '!alertingExample' \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --verbose
tc_end_block "Build Platform Plugins"

export KBN_NP_PLUGINS_BUILT=true

tc_start_block "Build OSS Distribution"
node scripts/build --debug --oss

# Renaming the build directory to a static one, so that we can put a static one in the TeamCity artifact rules
mv build/oss/kibana-*-SNAPSHOT-linux-x86_64 build/oss/kibana-build-oss
tc_end_block "Build OSS Distribution"
