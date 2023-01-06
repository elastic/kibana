#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
node scripts/build_kibana_platform_plugins.js

export JOB=kibana-defend-workflows-cypress

echo "--- Defend Workflows Cypress tests"

node scripts/functional_tests \
  --debug --bail \
  --config x-pack/test/defend_workflows_cypress/cli_config.ts

