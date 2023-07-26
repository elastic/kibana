#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh

export JOB=kibana-security-solution-chrome
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Security Solution tests (Chrome)"

cd x-pack/plugins/security_solution

yarn cypress:run:cloud; status=$?; yarn junit:merge && exit $status
