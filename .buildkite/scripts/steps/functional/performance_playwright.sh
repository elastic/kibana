#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/setup_bazel.sh

is_test_execution_step

run_bootstrap() {
    echo "Running yarn kbn bootstrap --force-install"
    yarn kbn bootstrap --force-install
}

echo "--- yarn install and boostrap"
if ! run_bootstrap; then
  echo "--- bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  run_bootstrap
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'yarn kbn bootstrap'
fi

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
  if [[ -z "${JOURNEYS_GROUP+x}" ]]; then
    echo "--- Running performance tests"
    node scripts/run_performance.js --kibana-install-dir "$KIBANA_BUILD_LOCATION"
  else
    echo "--- Running performance tests: '$JOURNEYS_GROUP' group"
    node scripts/run_performance.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" --group "$JOURNEYS_GROUP"
  fi
fi

echo "--- Upload journey step screenshots"
JOURNEY_SCREENSHOTS_DIR="${KIBANA_DIR}/data/journey_screenshots"
if [ -d "$JOURNEY_SCREENSHOTS_DIR" ]; then
  cd "$JOURNEY_SCREENSHOTS_DIR"
  buildkite-agent artifact upload "**/*fullscreen*.png"
  cd "$KIBANA_DIR"
fi

echo "--- Upload server logs"
JOURNEY_SERVER_LOGS_REL_PATH=".ftr/journey_server_logs"
JOURNEY_SERVER_LOGS_DIR="${KIBANA_DIR}/${JOURNEY_SERVER_LOGS_REL_PATH}"
if [ -d "$JOURNEY_SERVER_LOGS_DIR" ]; then
  cd "$KIBANA_DIR"
  tar -czf server-logs.tar.gz $JOURNEY_SERVER_LOGS_REL_PATH/**/*
  buildkite-agent artifact upload server-logs.tar.gz
fi
