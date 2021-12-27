#!/usr/bin/env bash

set -uo pipefail

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"
export CACHE_DIR="$HOME/.kibana"
export GCS_UPLOAD_PREFIX="FAKE_GCS_UPLOAD_PREFIX"

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/setup_node.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/build_kibana_plugins.sh

export CI="false"
export DEBUG="code-coverage"
export NODE_OPTIONS=--max_old_space_size=8192
export CODE_COVERAGE=1

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd x-pack

node scripts/functional_tests \
  --debug --bail \
  --config test/osquery_cypress/cli_config.ts

ls -a plugins/osquery
ls -a plugins/osquery/cypress
