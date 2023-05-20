#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

Xvfb :99 -screen 0 1680x946x24 &

export DISPLAY=:99

echo "--- Security Solution tests (Chrome)"

yarn --cwd x-pack/plugins/security_solution cypress:run
