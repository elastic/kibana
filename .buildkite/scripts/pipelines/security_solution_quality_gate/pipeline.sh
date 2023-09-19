#!/bin/bash

set -euo pipefail

echo "--------------------"
echo "The required urls"
echo "--------------------"
echo "ES URL: $TEST_ENV_ES_URL"
echo "KB URL: $TEST_ENV_KB_URL"

echo "--------------------"
echo "Environment Details"
echo "--------------------"
echo "Name: $TEST_ENV_NAME"
echo "Environment: $TEST_ENV_ENVIRONMENT"
echo "Region: $TEST_ENV_REGION"
echo "ID: $TEST_ENV_ID"
echo "Username: $TEST_ENV_USERNAME"
echo "Password: $TEST_ENV_PWD"
echo "Api key: $TEST_ENV_API_KEY"

echo "--------------------"
echo "TEST EXECUTION"
echo "--------------------"

source .buildkite/scripts/common/util.sh
# source .buildkite/scripts/steps/functional/common.sh
source .buildkite/scripts/steps/functional/common_cypress.sh
.buildkite/scripts/bootstrap.sh

export JOB=kibana-security-solution-chrome

echo "--- Serverless Security Solution Cypress tests (Chrome)"
cd x-pack/test/security_solution_cypress
mkdir -p ../../../target/kibana-security-solution/cypress/results/
set +e

CYPRESS_ELASTICSEARCH_URL=$TEST_ENV_ES_URL CYPRESS_BASE_URL=$TEST_ENV_KB_URL CYPRESS_ELASTICSEARCH_USERNAME=$TEST_ENV_USERNAME CYPRESS_ELASTICSEARCH_PASSWORD=$TEST_ENV_PWD CYPRESS_KIBANA_URL=$CYPRESS_BASE_URL yarn cypress:run:cloud:serverless; status=$?; yarn junit:merge || :; exit $status