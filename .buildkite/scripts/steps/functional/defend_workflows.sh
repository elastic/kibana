#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-defend-workflows-cypress

Xvfb -screen 0 1680x946x24 :99 &

export DISPLAY=:99

echo "--- Defend Workflows Cypress tests"

yarn --cwd x-pack/plugins/security_solution cypress:dw:run
