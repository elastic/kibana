#!/usr/bin/env bash

set -euo pipefail

echo "--- Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$KIBANA_DIR/examples" \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
  --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/alerting_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_perf/plugins" \
  --scan-dir "$XPACK_DIR/test/licensing_plugin/plugins" \
  --scan-dir "$XPACK_DIR/test/usage_collection/plugins" \
  --scan-dir "$XPACK_DIR/test/security_functional/fixtures/common" \
  --scan-dir "$XPACK_DIR/examples" \
  --verbose

echo "--- Archive built plugins"
shopt -s globstar
tar -zcf \
  target/kibana-default-plugins.tar.gz \
  x-pack/plugins/**/target/public \
  x-pack/test/**/target/public \
  examples/**/target/public \
  x-pack/examples/**/target/public \
  test/**/target/public
