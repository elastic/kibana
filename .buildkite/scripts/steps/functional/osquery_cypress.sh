#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

Xvfb :99 -screen 0 1600x1200x24 &

export DISPLAY=:99

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

yarn --cwd x-pack/plugins/security_solution cypress:run
