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
vault_get security-quality-gate/role-users data -format=json > .ftr/role_users.json

cd x-pack/test/security_solution_cypress
set +e

if [ -z "${KIBANA_MKI_USE_LATEST_COMMIT+x}" ] || [ "$KIBANA_MKI_USE_LATEST_COMMIT" = "0" ]; then
    KIBANA_OVERRIDE_FLAG=0
else
    KIBANA_OVERRIDE_FLAG=1
fi

QA_API_KEY=$(vault_get security-solution-quality-gate qa_api_key)
QA_CONSOLE_URL=$(vault_get security-solution-quality-gate qa_console_url)
BK_ANALYTICS_API_KEY=$(vault_get security-solution-quality-gate $BK_TEST_SUITE_KEY)

QA_CONSOLE_URL=$QA_CONSOLE_URL KIBANA_MKI_USE_LATEST_COMMIT=$KIBANA_OVERRIDE_FLAG BK_ANALYTICS_API_KEY=$BK_ANALYTICS_API_KEY CLOUD_QA_API_KEY=$QA_API_KEY yarn $1; status=$?; yarn junit:merge || :; exit $status
