#!/usr/bin/env bash

set -euo pipefail

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"
export CACHE_DIR="$HOME/.kibana"
export GCS_UPLOAD_PREFIX="FAKE_GCS_UPLOAD_PREFIX"

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/setup_node.sh

export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana_plugins.sh
.buildkite/scripts/download_build_artifacts.sh

export DEBUG="code-coverage"

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config test/osquery_cypress/cli_config.ts
