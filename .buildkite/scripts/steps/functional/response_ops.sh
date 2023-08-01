#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome

echo "--- Response Ops Cypress Tests on Security Solution"

cd "$XPACK_DIR"

export NODE_OPTIONS="$NODE_OPTIONS --openssl-legacy-provider"
checks-reporter-with-killswitch "Response Ops Cypress Tests on Security Solution" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
   --config test/security_solution_cypress/response_ops_cli_config.ts
