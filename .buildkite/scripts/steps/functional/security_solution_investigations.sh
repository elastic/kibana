#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}


Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

echo "--- Investigations Cypress Tests on Security Solution"

yarn --cwd x-pack/plugins/security_solution cypress:investigations:run
