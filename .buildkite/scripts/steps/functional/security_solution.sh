#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome

echo "--- Security Solution tests (Chrome)"

checks-reporter-with-killswitch "Security Solution Cypress Tests (Chrome)" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
   --config x-pack/test/security_solution_cypress/cli_config.ts
