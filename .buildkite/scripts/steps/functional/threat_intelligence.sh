#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-threat-intelligence-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Threat Intelligence Cypress tests (Chrome)"

BK_ANALYTICS_API_KEY=$(vault_get security-solution-ci threat-intelligence-bk-api-key)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn --cwd x-pack/plugins/threat_intelligence cypress:run