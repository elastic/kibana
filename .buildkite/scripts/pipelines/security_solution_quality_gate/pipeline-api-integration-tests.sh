#!/bin/bash
set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

echo "--- Serverless Security Second Quality Gate"
cd x-pack
set +e

VAULT_DEC_KEY=$(vault read -field=key secret/kibana-issues/dev/security-solution-qg-enc-key)
ENV_PWD=$(echo $TEST_ENV_PWD | openssl aes-256-cbc -d -a -pass pass:$VAULT_DEC_KEY)

# Removing the https:// part of the url provided in order to use it in the command below.
ES_URL="${TEST_ENV_ES_URL/https:\/\//}"    
KB_URL="${TEST_ENV_KB_URL/https:\/\//}"

TEST_CLOUD=1 TEST_ES_URL="https://elastic:$ENV_PWD@$ES_URL" TEST_KIBANA_URL="https://elastic:$ENV_PWD@$KB_URL" node scripts/functional_test_runner.js --config test/security_solution_api_integration/test_suites/detections_response/serverless.config.ts