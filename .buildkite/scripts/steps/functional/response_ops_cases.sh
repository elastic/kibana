#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome

echo "--- Response Ops Cases Cypress Tests on Security Solution"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Response Ops Cases Cypress Tests on Security Solution" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
   --config test/security_solution_cypress/cases_cli_config.ts
