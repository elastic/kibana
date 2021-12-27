#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/build_kibana_plugins.sh

export DEBUG="code-coverage"

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config test/osquery_cypress/cli_config.ts
