#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-threat-intelligence-chrome

echo "--- Threat Intelligence tests (Chrome)"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config x-pack/test/threat_intelligence_cypress/cli_config_parallel.ts
