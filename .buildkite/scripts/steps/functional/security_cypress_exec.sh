#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=$JOB_TITLE
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo $MSG

cd $CURRENT_WORKING_DIR

TARGETS_ARRAY=$(jq .scripts package.json | jq 'keys')
if [[ " ${TARGETS_ARRAY[*]} " == *"$TARGET"* ]]; then
    echo "Target '$TARGET' exists in the available targets in package.json"
    echo "Proceeding in test run!"
else
    echo "The provided target '$TARGET' could not be found in the available targets in package.json"
    echo "Abort the test runtime due to unexpected target script"
    exit 1
fi

set +e
yarn $TARGET; status=$?; yarn junit:merge || :; exit $status
