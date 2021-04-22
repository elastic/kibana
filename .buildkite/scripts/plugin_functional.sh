#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- Downloading Distribution and Plugin artifacts'

cd "$WORKSPACE"

buildkite-agent artifact download kibana-oss.tar.gz .
buildkite-agent artifact download kibana-oss-plugins.tar.gz .

mkdir -p "$KIBANA_OSS_BUILD_LOCATION"
tar -xzf kibana-oss.tar.gz -C "$KIBANA_OSS_BUILD_LOCATION" --strip=1

cd "$KIBANA_DIR"

tar -xzf ../kibana-oss-plugins.tar.gz

echo '--- Build kbn_sample_panel_action'
cd "$KIBANA_DIR/test/plugin_functional/plugins/kbn_sample_panel_action"
yarn build

cd "$KIBANA_DIR"

echo '--- Plugin functional tests'
node scripts/functional_tests \
    --config test/plugin_functional/config.ts \
    --bail \
    --debug

echo '--- Interpreter functional tests'
node scripts/functional_tests \
  --config test/interpreter_functional/config.ts \
  --bail \
  --debug \
  --kibana-install-dir "$KIBANA_OSS_BUILD_LOCATION"
