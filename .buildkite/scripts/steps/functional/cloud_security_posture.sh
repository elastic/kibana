#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-cloud-security-posture-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Cloud Security Posture Workflows Cypress tests"

cd x-pack/solutions/security/test/security_solution_cypress

set +e

yarn cypress:cloud_security_posture:run:ess; status=$?; yarn junit:merge || :

# Scout reporter
upload_scout_cypress_events "Cypress tests"

exit $status
