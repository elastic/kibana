#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
export JOB=kibana-security-solution-ai-assistant-scout-serverless

SCOUT_CONFIG="x-pack/solutions/security/plugins/security_solution/test/scout/ui/ai_assistant.playwright.config.ts"

echo "--- Running AI Assistant Scout tests (serverless security complete): $SCOUT_CONFIG"

set +e
node scripts/scout run-tests \
  --location local \
  --arch serverless \
  --domain security_complete \
  --config "$SCOUT_CONFIG" \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
status=$?
set -e

if [[ "${SCOUT_REPORTER_ENABLED:-}" =~ ^(1|true)$ ]]; then
  if [ -d ".scout/reports" ] && [ "$(ls -A .scout/reports 2>/dev/null)" ]; then
    echo "--- Upload Scout reporter events for AI Assistant serverless security complete tests"
    node scripts/scout upload-events --dontFailOnError || true
  fi
fi

exit $status
