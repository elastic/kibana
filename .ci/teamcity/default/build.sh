#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

tc_start_block "Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
  --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/alerting_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_perf/plugins" \
  --scan-dir "$XPACK_DIR/test/licensing_plugin/plugins" \
  --verbose
tc_end_block "Build Platform Plugins"

export KBN_NP_PLUGINS_BUILT=true

tc_start_block "Build Default Distribution"

cd "$KIBANA_DIR"
node scripts/build --debug --no-oss
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1

tc_end_block "Build Default Distribution"
