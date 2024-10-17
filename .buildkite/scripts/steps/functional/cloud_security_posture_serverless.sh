#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-cloud-security-posture-serverless-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Cloud Security Posture Workflows Cypress tests on Serverless"

cd x-pack/test/security_solution_cypress

set +e

yarn cypress:cloud_security_posture:run:serverless; status=$?; yarn junit:merge || :; exit $status
