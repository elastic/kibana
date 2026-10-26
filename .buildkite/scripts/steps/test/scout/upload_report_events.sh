#!/usr/bin/env bash

set -euo pipefail

echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  node scripts/scout upload-events --dontFailOnError
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi
