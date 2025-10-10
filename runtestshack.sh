#!/usr/bin/env bash

# Stop on unset variables and report errors in pipelines
set -u -o pipefail

while true; do
  echo "Running functional tests..."
  node scripts/functional_tests.js \
    --config x-pack/platform/test/security_api_integration/session_idle.config.hack.ts --esFrom source

  exit_code=$?

  if [ "$exit_code" -ne 0 ]; then
    echo "Command failed with exit code $exit_code. Stopping loop."
    exit "$exit_code"
  fi

  echo "Command succeeded. Running again..."
  echo "-------------------------------------------"
done
