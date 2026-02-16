#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
export JOB=kibana-osquery-scout

echo "--- Osquery Scout (Playwright) tests"

# Verify Docker is available (required for Fleet Server and Elastic Agent)
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not available. Osquery Scout tests require Docker for Fleet Server and Elastic Agent."
  exit 1
fi

echo "Docker is available ✅"

# Clean up any stale containers from previous runs
echo "--- Cleaning up stale Docker containers"
docker rm -f scout-fleet-server scout-osquery-agent-0 scout-osquery-agent-1 2>/dev/null || true

SCOUT_CONFIG="x-pack/platform/plugins/shared/osquery/test/scout_osquery/ui/parallel.playwright.config.ts"

echo "--- Running Scout tests (stateful): $SCOUT_CONFIG"

set +e
node scripts/scout.js run-tests \
  --arch stateful \
  --domain classic \
  --config "$SCOUT_CONFIG" \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
status_stateful=$?
set -e

# Clean up Docker containers between runs
echo "--- Cleaning up Docker containers between runs"
docker rm -f scout-fleet-server scout-osquery-agent-0 scout-osquery-agent-1 2>/dev/null || true

echo "--- Running Scout tests (serverless security): $SCOUT_CONFIG"

set +e
node scripts/scout.js run-tests \
  --arch serverless \
  --domain security_complete \
  --config "$SCOUT_CONFIG" \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
status_serverless=$?
set -e

# Use the worst exit code
if [ $status_stateful -ne 0 ]; then
  status=$status_stateful
elif [ $status_serverless -ne 0 ]; then
  status=$status_serverless
else
  status=0
fi

# Clean up Docker containers after test run
echo "--- Cleaning up Docker containers"
docker rm -f scout-fleet-server scout-osquery-agent-0 scout-osquery-agent-1 2>/dev/null || true

# Upload Scout reporter events
if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
  if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
    echo "--- Upload Scout reporter events for Osquery Scout tests"
    node scripts/scout upload-events --dontFailOnError || true
  fi
fi

exit $status
