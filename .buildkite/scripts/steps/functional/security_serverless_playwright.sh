#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-playwright
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "---SERVERLESS - Security Solution Playwright Tests"

export PLAYWRIGHT_BROWSERS_PATH=0

cd x-pack/test/security_solution_playwright

set +e

yarn run:serverless; exit_code=$?; exit $exit_code
