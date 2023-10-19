#!/bin/bash
set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

echo "--- Serverless Security Second Quality Gate"
cd x-pack/test/security_solution_api_integration
set +e

VAULT_DEC_KEY=$(retry 5 5 vault read -field=enc_key secret/kibana-issues/dev/security-solution-qg-enc-key)
ENV_PWD=$(echo $TEST_ENV_PWD | openssl aes-256-cbc -d -a -pass pass:$VAULT_DEC_KEY)

# Removing the https:// part of the url provided in order to use it in the command below.
ES_URL="${TEST_ENV_ES_URL/https:\/\//}"    
KB_URL="${TEST_ENV_KB_URL/https:\/\//}"

echo "Running the script exception_workflows:runner:serverless"
TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" yarn run exception_workflows:runner:serverless
echo "Running the script exception_operators_date_numeric_types:runner:serverless"
TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" yarn run exception_operators_date_numeric_types:runner:serverless
echo "Running the script exception_operators_keyword_text_long:runner:serverless"
TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" yarn run exception_operators_keyword_text_long:runner:serverless
echo "Running the script exception_operators_ips_text_array:runner:serverless"
TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" yarn run exception_operators_ips_text_array:runner:serverless
echo "Running the script rule_creation:runner:serverless"
TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" yarn run rule_creation:runner:serverless