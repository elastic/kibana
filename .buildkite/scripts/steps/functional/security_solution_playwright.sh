#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-playwright
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- ESS - Security Solution Playwright Tests"

cd x-pack/test/security_solution_playwright

yarn run:ess; exit_code=$?; exit $exit_code