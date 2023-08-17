#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" 'false'

echo "--- Security Solution Cypress tests, burning changed specs (Chrome)"

yarn --cwd x-pack/test/security_solution_cypress cypress:changed-specs-only:serverless
