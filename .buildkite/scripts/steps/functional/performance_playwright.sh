#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

# These tests are running on static workers so we have to make sure we delete previous build of Kibana
rm -rf "$KIBANA_BUILD_LOCATION"
.buildkite/scripts/download_build_artifacts.sh

if [ "$BUILDKITE_PIPELINE_SLUG" == "kibana-performance-data-set-extraction" ]; then
  # 'performance-data-set-extraction' uses 'n2-2-spot' agent, performance metrics don't matter
  # and we skip warmup phase for each test
  echo "--- Running single user journeys"
  node scripts/run_performance.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" --skip-warmup
else
  # pipeline should use bare metal static worker
  for i in {1..5};
  do
    echo "--- Running performance tests #$i"
    node scripts/run_performance.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" --journey-path x-pack/performance/journeys/data_stress_test_lens.ts
    sleep 120
  done
fi

echo "--- Upload journey step screenshots"
JOURNEY_SCREENSHOTS_DIR="${KIBANA_DIR}/data/journey_screenshots"
if [ -d "$JOURNEY_SCREENSHOTS_DIR" ]; then
  cd "$JOURNEY_SCREENSHOTS_DIR"
  buildkite-agent artifact upload "**/*fullscreen*.png"
  cd "$KIBANA_DIR"
fi
