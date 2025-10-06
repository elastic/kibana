#!/usr/bin/env bash

set -euo pipefail

SCOUT_EXTRA_ARGS=""
if [ -n "${SCOUT_EVENT_LOG_PATH:-}" ]; then
  SCOUT_EXTRA_ARGS="--eventLogPath $SCOUT_EVENT_LOG_PATH"
fi

echo "--- Upload Scout reporter events to AppEx QA's team cluster"
if [[ "${SCOUT_REPORTER_ENABLED:-}" == "true" ]]; then
  # shellcheck disable=SC2086
  node scripts/scout upload-events --dontFailOnError $SCOUT_EXTRA_ARGS
else
  echo "⚠️ The SCOUT_REPORTER_ENABLED environment variable is not 'true'. Skipping event upload."
fi
