#!/usr/bin/env bash

set -euo pipefail

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
  --scan-dir "$KIBANA_DIR/examples" \
  --scan-dir "$XPACK_DIR/examples" \
  --verbose

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
node scripts/build --debug --no-oss

echo "--- Ship Kibana Distribution Metrics to CI Stats"
node scripts/ship_ci_stats \
  --metrics target/optimizer_bundle_metrics.json \
  --metrics packages/kbn-ui-shared-deps/target/metrics.json

echo "--- Archive Kibana Distribution"
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"

echo "--- Archive built plugins"
shopt -s globstar
tar -zcf \
  target/kibana-default-plugins.tar.gz \
  x-pack/plugins/**/target/public \
  x-pack/test/**/target/public \
  examples/**/target/public \
  x-pack/examples/**/target/public \
  test/**/target/public

echo "--- Upload Build Artifacts"
# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
mv kibana-*-linux-x86_64.tar.gz kibana-default.tar.gz
buildkite-agent artifact upload kibana-default.tar.gz
buildkite-agent artifact upload kibana-default-plugins.tar.gz
cd -
