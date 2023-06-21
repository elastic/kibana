#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-defend-workflows-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

Xvfb -screen 0 1680x946x24 :99 &

export DISPLAY=:99

echo "--- Defend Workflows Cypress tests"

yarn --cwd x-pack/plugins/security_solution cypress:dw:run
