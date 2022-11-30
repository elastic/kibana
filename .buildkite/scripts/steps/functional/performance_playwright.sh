#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh

echo "--- Running performance tests"
node scripts/run_performance.js --kibana-install-dir "$KIBANA_BUILD_LOCATION"

echo "--- Upload journey step screenshots"
JOURNEY_SCREENSHOTS_DIR="${KIBANA_DIR}/data/journey_screenshots"
if [ -d "$JOURNEY_SCREENSHOTS_DIR" ]; then
  cd "$JOURNEY_SCREENSHOTS_DIR"
  buildkite-agent artifact upload "**/*fullscreen*.png"
  cd "$KIBANA_DIR"
fi
