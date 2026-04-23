#!/usr/bin/env bash

set -euo pipefail

# Note, changes here might also need to be made in other scripts, e.g. uptime.sh

source .buildkite/scripts/common/util.sh

# All functional/integration test steps run Kibana from the distributable,
# so dev-mode webpack bundles built during bootstrap are never used.
export KBN_BOOTSTRAP_NO_PREBUILT=true

# Bootstrap and artifact download are independent — run them in parallel.
# Bootstrap installs node_modules; the download fetches the pre-built Kibana distributable.
# To keep logs readable, the download runs in the background with its output captured
# to a file; its log is emitted after bootstrap completes.
download_log=$(mktemp)
.buildkite/scripts/download_build_artifacts.sh >"$download_log" 2>&1 &
download_pid=$!

bootstrap_exit=0
.buildkite/scripts/bootstrap.sh || bootstrap_exit=$?

download_exit=0
wait $download_pid || download_exit=$?

cat "$download_log"
rm -f "$download_log"

if [[ $bootstrap_exit -ne 0 ]]; then
  echo "Bootstrap failed with exit code $bootstrap_exit"
  exit $bootstrap_exit
fi

if [[ $download_exit -ne 0 ]]; then
  echo "Artifact download failed with exit code $download_exit"
  exit $download_exit
fi
.buildkite/scripts/setup_es_snapshot_cache.sh

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
