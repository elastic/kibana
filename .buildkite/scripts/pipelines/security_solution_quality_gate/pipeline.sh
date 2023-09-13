#!/bin/bash

set -euo pipefail


echo "This is the passed environment variable"

echo "--------------------"
echo "The required urls"
echo "--------------------"
echo "ES URL: $TEST_ENV_ES_URL"
echo ":KB URL: $TEST_ENV_KB_URL"

echo "--------------------"
echo "Environment Details"
echo "--------------------"
echo $TEST_ENV_NAME
echo $TEST_ENV_ENVIRONMENT
echo $TEST_ENV_REGION
echo $TEST_ENV_ID
echo $TEST_ENV_USERNAME
echo $TEST_ENV_PWD
echo $TEST_ENV_API_KEY

echo "--------------------"
echo "TEST EXECUTION"
echo "--------------------"
echo $pwd
# CYPRESS_ELASTICSEARCH_URL=$TEST_ENV_ES_URL CYPRESS_BASE_URL=$TEST_ENV_KB_URL CYPRESS_ELASTICSEARCH_USERNAME=$TEST_ENV_USERNAME CYPRESS_ELASTICSEARCH_PASSWORD=$TEST_ENV_PWD CYPRESS_KIBANA_URL=$CYPRESS_BASE_URL yarn cypress:run:cloud:serverless