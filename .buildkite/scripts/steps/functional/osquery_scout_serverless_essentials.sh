#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
export JOB=kibana-osquery-scout-serverless-essentials

echo "--- Osquery Scout (Playwright) Serverless Security Essentials tests"

# Essentials tier tests only verify PLI-based UI permissions (response actions
# available/unavailable). They do NOT submit live queries or interact with
# agents, so Docker/Fleet/Agent provisioning is skipped entirely.

SCOUT_CONFIG="x-pack/platform/plugins/shared/osquery/test/scout_osquery/ui/parallel.playwright.config.ts"

echo "--- Running Scout tests (serverless security_essentials, no Docker): $SCOUT_CONFIG"

set +e
node scripts/scout run-tests \
  --location local \
  --arch serverless \
  --domain security_essentials \
  --serverConfigSet osquery \
  --config "$SCOUT_CONFIG" \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
status=$?
set -e

# Upload Scout reporter events
if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
  if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
    echo "--- Upload Scout reporter events for Osquery Scout Serverless Essentials tests"
    node scripts/scout upload-events --dontFailOnError || true
  fi
fi

exit $status
