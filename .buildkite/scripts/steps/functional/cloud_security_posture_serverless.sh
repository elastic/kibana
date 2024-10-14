#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-cloud-security-posture-serverless-cypress
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Cloud Security Posture Workflows Cypress tests on Serverless"

cd x-pack/plugins/security_solution

set +e

yarn cypress:run:qa:serverless:cloud_security_posture; status=$?; yarn junit:merge || :; exit $status
