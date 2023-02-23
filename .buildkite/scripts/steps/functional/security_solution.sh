#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export CLI_NUMBER=${CLI_NUMBER:-$((BUILDKITE_PARALLEL_JOB+1))}
export CLI_COUNT=${CLI_COUNT:-$BUILDKITE_PARALLEL_JOB_COUNT}

echo "--- Security Solution tests (Chrome)"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config x-pack/test/security_solution_cypress/cli_config_parallel.ts
