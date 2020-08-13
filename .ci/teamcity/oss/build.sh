#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

tc_start_block "Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --filter '!alertingExample' \
  --scan-dir "${'$'}KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "${'$'}KIBANA_DIR/test/interpreter_functional/plugins" \
  --verbose
tc_end_block "Build Platform Plugins"

export KBN_NP_PLUGINS_BUILT=true

tc_start_block "Build OSS Distribution"
node scripts/build --debug --oss
tc_end_block "Build OSS Distribution"
