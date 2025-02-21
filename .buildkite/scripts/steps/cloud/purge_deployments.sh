#!/usr/bin/env bash

set -uo pipefail
# Note, -e is not set above, so we can capture all errors, and attempt purge individually

echo '--- Purging Cloud deployments'
ts-node .buildkite/scripts/steps/cloud/purge_deployments.ts
EXIT_CODE_CLOUD=$?

echo '--- Purging Project deployments'
ts-node .buildkite/scripts/steps/cloud/purge_projects.ts
EXIT_CODE_PROJECTS=$?

if [ $EXIT_CODE_CLOUD -ne 0 ] || [ $EXIT_CODE_PROJECTS -ne 0 ]; then
  echo "❌ Purge failed (EXIT_CODE_CLOUD=$EXIT_CODE_CLOUD | EXIT_CODE_PROJECTS=$EXIT_CODE_PROJECTS)"
  exit 1
fi
