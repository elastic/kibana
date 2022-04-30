#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome

echo "--- Security Solution tests (Chrome)"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Security Solution Cypress Tests (Chrome)" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
   --config test/security_solution_cypress/cli_config.ts
