#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Downloading Scout Test Configuration for Burn-in'
# The artifact is produced by the Scout Test Run Builder step (build_scout_tests).
# Since we don't depend on the full Scout test group, the artifact may not exist yet.
# Retry up to 30 times (5 minutes) to wait for it.
RETRIES=30
for i in $(seq 1 $RETRIES); do
  if download_artifact scout_playwright_configs.json . 2>/dev/null; then
    echo "Downloaded scout_playwright_configs.json on attempt $i"
    break
  fi
  if [[ $i -eq $RETRIES ]]; then
    echo "Failed to download scout_playwright_configs.json after $RETRIES attempts"
    exit 1
  fi
  echo "Artifact not ready yet, waiting 10s... (attempt $i/$RETRIES)"
  sleep 10
done

# Copy to the expected location for the TypeScript builder
mkdir -p .scout/test_configs
cp scout_playwright_configs.json .scout/test_configs/scout_playwright_configs.json

echo '--- Producing Scout Burn-in Test Execution Steps'
ts-node "$(dirname "${0}")/scout_burn_in_test_run_builder.ts"
