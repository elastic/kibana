#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=$JOB_TITLE
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo $MSG

cd $CURRENT_WORKING_DIR

set +e
yarn $TARGET; status=$?; yarn junit:merge || :; exit $status
