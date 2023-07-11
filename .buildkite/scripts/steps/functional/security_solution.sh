#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}
# export BUILDKITE_ANALYTICS_TOKEN="$(retry 5 5 vault read -field=security_solution secret/siem-team/kibana/buildkite_test_analytics_cypress)"
export BUILDKITE_ANALYTICS_TOKEN="MPu8UNja9jkyonNxrd9r66De"

Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

echo "--- Security Solution tests (Chrome)"

yarn --cwd x-pack/plugins/security_solution cypress:run
