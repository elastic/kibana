#!/usr/bin/env bash

set -euo pipefail

buildPlatformPlugins() {
  echo "--- Build Platform Plugins"

  NODE_OPTIONS=--max_old_space_size=14336 \
    node scripts/build_kibana_platform_plugins \
    --no-examples --test-plugins --workers 4
}

runFTRInstrumented() {
  local ftrConfig=$1
  echo "--- $ runFTRInstrumented against $ftrConfig"

  NODE_OPTIONS=--max_old_space_size=16384 \
    ./node_modules/.bin/nyc \
    --nycrc-path ./src/dev/code_coverage/nyc_config/nyc.server.config.js \
    node scripts/functional_tests \
    --config="$ftrConfig" \
    --exclude-tag "skipCoverage"
}

reportMergeFunctional() {
  echo "--- Merging code coverage for FTR Configs"

  NODE_OPTIONS=--max_old_space_size=16384 yarn nyc report \
    --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js --reporter json
}
