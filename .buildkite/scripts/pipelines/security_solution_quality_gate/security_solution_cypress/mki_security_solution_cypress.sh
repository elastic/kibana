#!/bin/bash

set -euo pipefail

if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/functional/common_cypress.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-security-solution-chrome

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

mkdir .ftr
retry 5 5 vault kv get -format=json -field=data secret/kibana-issues/dev/security-quality-gate/role-users > .ftr/role_users.json

cd x-pack/test/security_solution_cypress
set +e

QA_API_KEY=$(vault_get security-solution-qg-enc-key qa_api_key)

CLOUD_QA_API_KEY=$QA_API_KEY yarn $1; status=$?; yarn junit:merge || :; exit $status
