#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

export JOB=kibana-osquery-cypress

echo "--- Osquery Cypress tests"

cd x-pack/plugins/osquery

set +e
yarn cypress:run; status=$?; yarn junit:merge || :; exit $status
