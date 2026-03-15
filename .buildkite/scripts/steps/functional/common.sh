#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Run distribution download and ES snapshot cache setup in parallel.
# These steps are independent of each other and together take 30-60s sequentially.
.buildkite/scripts/download_build_artifacts.sh &
DOWNLOAD_PID=$!

.buildkite/scripts/setup_es_snapshot_cache.sh &
ES_CACHE_PID=$!

# Wait for both to complete; fail if either fails
PARALLEL_EXIT=0
wait $DOWNLOAD_PID || PARALLEL_EXIT=$?
wait $ES_CACHE_PID || PARALLEL_EXIT=$?

if [[ "$PARALLEL_EXIT" != "0" ]]; then
  echo "One or more parallel setup steps failed (exit code: $PARALLEL_EXIT)"
  exit $PARALLEL_EXIT
fi

is_test_execution_step

# Upload Scout reporter events after Cypress test execution
upload_scout_cypress_events() {
  local test_name="${1:-Cypress tests}"

  if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
    # Save current directory and navigate to Kibana root
    local current_dir=$(pwd)
    cd "${KIBANA_DIR:-$(git rev-parse --show-toplevel)}"

    # Check if reports exist before uploading
    if compgen -G '.scout/reports/*' > /dev/null; then
      echo "--- Upload Scout reporter events to AppEx QA's team cluster for $test_name"
      node scripts/scout upload-events --dontFailOnError

      # Clean up only Cypress event reports to avoid double ingestion
      # Only remove scout-cypress-* directories, preserving other test reports and failure reports
      if compgen -G '.scout/reports/scout-cypress-*' > /dev/null; then
       echo "🧹 Cleaning up Scout Cypress event reports"
       rm -rf .scout/reports/scout-cypress-*
      fi
    else
      echo "❌ No Scout reports found for $test_name"
    fi

    # Return to original directory
    cd "$current_dir"
  else
    echo "SCOUT_REPORTER_ENABLED=$SCOUT_REPORTER_ENABLED, skipping event upload."
  fi
}

