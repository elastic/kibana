#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-threat-intelligence-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Threat Intelligence Cypress tests (Chrome)"

BK_ANALYTICS_API_KEY=$(retry 5 5 vault read -field=threat-intelligence-bk-api-key secret/kibana-issues/dev/security-solution-ci)

BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY yarn --cwd x-pack/plugins/threat_intelligence cypress:run
