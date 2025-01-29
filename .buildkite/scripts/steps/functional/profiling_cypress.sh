#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-profiling-cypress

echo "--- Profiling Cypress Tests"

cd "$XPACK_DIR/solutions/observability/plugins/profiling/e2e"

set +e
yarn cypress:run; status=$?; yarn junit:merge || :; exit $status
