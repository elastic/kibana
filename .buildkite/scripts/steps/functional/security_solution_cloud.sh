#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

echo "--- Security Solution tests (Chrome)"

DEBUG=currents:* TZ=UTC npx cypress-cloud --parallel --record --ci-build-id=22132313 --config-file ./cypress/cypress_ci_cloud.config.ts --browser chrome
