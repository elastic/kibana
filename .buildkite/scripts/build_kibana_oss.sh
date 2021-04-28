#!/usr/bin/env bash

set -euo pipefail

echo "--- Build Platform Plugins"
node scripts/build_kibana_platform_plugins \
  --oss \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/interpreter_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$KIBANA_DIR/examples" \
  --verbose

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
node scripts/build --debug --oss

echo "--- Ship Kibana Distribution Metrics to CI Stats"
node scripts/ship_ci_stats \
  --metrics target/optimizer_bundle_metrics.json \
  --metrics packages/kbn-ui-shared-deps/target/metrics.json

echo "--- Archive Kibana Distribution"
cd build/oss
tar -czf "$KIBANA_DIR/target/kibana-oss.tar.gz" kibana-*-SNAPSHOT-linux-x86_64
cd -

echo "--- Archive built plugins"
shopt -s globstar
tar -zcf \
  target/kibana-oss-plugins.tar.gz \
  examples/**/target/public \
  test/**/target/public

echo "--- Upload Build Artifacts"
# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload kibana-oss.tar.gz
buildkite-agent artifact upload kibana-oss-plugins.tar.gz
cd -
