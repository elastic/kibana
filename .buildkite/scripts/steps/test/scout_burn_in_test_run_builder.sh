#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

echo '--- Downloading Scout Test Configuration for Burn-in'
download_artifact scout_playwright_configs.json .

# Copy to the expected location for the TypeScript builder
mkdir -p .scout/test_configs
cp scout_playwright_configs.json .scout/test_configs/scout_playwright_configs.json

echo '--- Producing Scout Burn-in Test Execution Steps'
ts-node "$(dirname "${0}")/scout_burn_in_test_run_builder.ts"
