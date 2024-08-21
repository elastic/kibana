#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-playwright
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "---ESS - Security Solution Playwright Tests"

yarn playwright install

cd x-pack/test/security_solution_playwright

set +e

yarn run:ess; 

exit_code=$?
