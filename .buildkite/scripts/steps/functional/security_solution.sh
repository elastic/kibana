#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
# source .buildkite/scripts/common/util.sh

# .buildkite/scripts/bootstrap.sh
# node scripts/build_kibana_platform_plugins.js

export JOB=kibana-security-solution-chrome
# export CLI_NUMBER=${CLI_NUMBER:-$((BUILDKITE_PARALLEL_JOB+1))}
# export CLI_COUNT=${CLI_COUNT:-$BUILDKITE_PARALLEL_JOB_COUNT}
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

Xvfb :99 &

export DISPLAY=:99

echo "--- Security Solution tests (Chrome)"

yarn --cwd x-pack/plugins/security_solution cypress:run-as-ci-parallel

# node scripts/functional_tests \
#   --debug --bail \
#   --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
#   --config x-pack/test/security_solution_cypress/cli_config_parallel.ts
