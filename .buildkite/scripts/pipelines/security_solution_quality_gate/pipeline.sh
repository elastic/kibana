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

VAULT_DEC_KEY=$(vault read -field=key secret/kibana-issues/dev/security-solution-qg-enc-key)
ENV_PWD=$(echo $TEST_ENV_PWD | openssl aes-256-cbc -d -a -pass pass:$VAULT_DEC_KEY)

CYPRESS_ELASTICSEARCH_URL=$TEST_ENV_ES_URL CYPRESS_BASE_URL=$TEST_ENV_KB_URL CYPRESS_ELASTICSEARCH_USERNAME=$TEST_ENV_USERNAME CYPRESS_ELASTICSEARCH_PASSWORD=$ENV_PWD CYPRESS_KIBANA_URL=$CYPRESS_BASE_URL yarn cypress:run:qa:serverless; status=$?; yarn junit:merge || :; exit $status