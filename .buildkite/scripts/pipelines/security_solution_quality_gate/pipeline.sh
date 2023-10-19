#!/bin/bash
set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-security-solution-chrome

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

echo "--- Serverless Security Second Quality Gate"
cd x-pack/test/security_solution_cypress
set +e

QA_API_KEY=$(retry 5 5 vault read -field=api-key secret/kibana-issues/dev/security-solution-qg-enc-key)

CLOUD_QA_API_KEY=$QA_API_KEY yarn cypress:run:qa:serverless:parallel; status=$?; yarn junit:merge || :; exit $status