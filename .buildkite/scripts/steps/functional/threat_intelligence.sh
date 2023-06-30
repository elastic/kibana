#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-threat-intelligence-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

echo "--- Threat Intelligence tests (Chrome)"

yarn --cwd x-pack/plugins/threat_intelligence cypress:run
