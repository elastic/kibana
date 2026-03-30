#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
export JOB=kibana-defend-workflows-serverless-cypress

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" 'false'

source .buildkite/scripts/steps/functional/ensure_virtualbox.sh

echo "--- Generating split Cypress specs"
node x-pack/solutions/security/plugins/security_solution/public/management/cypress/scripts/generate_cypress_split_specs.js

echo "--- Defend Workflows Cypress tests, burning changed specs (Chrome)"

yarn --cwd x-pack/solutions/security/plugins/security_solution cypress:dw:serverless:changed-specs-only
