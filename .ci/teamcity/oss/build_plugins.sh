#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

tc_start_block "Build Platform Plugins - OSS"

node scripts/build_kibana_platform_plugins \
  --oss \
  --filter '!alertingExample' \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --verbose
tc_end_block "Build Platform Plugins - OSS"
