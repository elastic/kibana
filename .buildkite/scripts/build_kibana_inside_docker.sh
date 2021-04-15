#!/usr/bin/env bash

set -euo pipefail

# TODO this file is temporary for testing

# source "$(dirname "${0}")/env.sh"

# "$(dirname "${0}")/bootstrap.sh"

echo "--- Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
  --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/alerting_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_perf/plugins" \
  --scan-dir "$XPACK_DIR/test/licensing_plugin/plugins" \
  --scan-dir "$XPACK_DIR/test/usage_collection/plugins" \
  --verbose

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
node scripts/build --debug --no-oss
