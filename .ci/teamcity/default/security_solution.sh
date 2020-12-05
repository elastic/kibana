#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

export JOB=kibana-default-securitySolution
export KIBANA_INSTALL_DIR="$PARENT_DIR/build/kibana-build-default"

cd "$XPACK_DIR"

checks-reporter-with-killswitch "Security Solution Cypress Tests" \
 node scripts/functional_tests \
   --debug --bail \
   --kibana-install-dir "$KIBANA_INSTALL_DIR" \
   --config test/security_solution_cypress/cli_config.ts
