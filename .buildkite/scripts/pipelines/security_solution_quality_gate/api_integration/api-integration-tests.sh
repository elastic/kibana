#!/bin/bash
if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

echo "--- Serverless Security Second Quality Gate"
cd x-pack/test/security_solution_api_integration
set +e

QA_API_KEY=$(vault_get security-solution-quality-gate qa_api_key)
QA_CONSOLE_URL=$(vault_get security-solution-quality-gate qa_console_url)

# Generate a random 5-digit number
random_number=$((10000 + $RANDOM % 90000))
if [ -z "${KIBANA_MKI_USE_LATEST_COMMIT+x}" ] || [ "$KIBANA_MKI_USE_LATEST_COMMIT" = "0" ]; then
  ENVIRONMENT_DETAILS=$(curl --location "$QA_CONSOLE_URL/api/v1/serverless/projects/security" \
    --header "Authorization: ApiKey $QA_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
          "name": "ftr-integration-tests-'$random_number'",
          "region_id": "aws-eu-west-1"}' | jq '.')
else
  KBN_COMMIT_HASH=${BUILDKITE_COMMIT:0:12}
  ENVIRONMENT_DETAILS=$(curl --location "$QA_CONSOLE_URL/api/v1/serverless/projects/security" \
    --header "Authorization: ApiKey $QA_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
          "name": "ftr-integration-tests-'$random_number'",
          "region_id": "aws-eu-west-1",
          "overrides": {
            "kibana": {
              "docker_image" : "docker.elastic.co/kibana-ci/kibana-serverless:sec-sol-qg-'$KBN_COMMIT_HASH'"
              }
            }
          }' | jq '.')
fi

NAME=$(echo $ENVIRONMENT_DETAILS | jq -r '.name')
ID=$(echo $ENVIRONMENT_DETAILS | jq -r '.id')
ES_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.endpoints.elasticsearch')
KB_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.endpoints.kibana')

# Wait five seconds for the project to appear
sleep 5

# Resetting the credentials of the elastic user in the project
CREDS_BODY=$(curl -s --location --request POST "$QA_CONSOLE_URL/api/v1/serverless/projects/security/$ID/_reset-internal-credentials" \
  --header "Authorization: ApiKey $QA_API_KEY" \
  --header 'Content-Type: application/json' | jq '.')
USERNAME=$(echo $CREDS_BODY | jq -r '.username')
PASSWORD=$(echo $CREDS_BODY | jq -r '.password')
AUTH=$(echo "$USERNAME:$PASSWORD")

# Checking if Elasticsearch has status green
while : ; do
  STATUS=$(curl -u $AUTH --location "$ES_URL:443/_cluster/health?wait_for_status=green&timeout=50s" | jq -r '.status')
  if [ "$STATUS" != "green" ]; then
    echo "Sleeping for 40s to wait for ES status to be green..."
    sleep 40
  else
    echo "Elasticsearch has status green."
    break
  fi
done

# Checking if Kibana is available
while : ; do
  STATUS=$(curl -u $AUTH --location "$KB_URL:443/api/status" | jq -r '.status.overall.level')
  if [ "$STATUS" != "available" ]; then
    echo "Sleeping for 15s to wait for Kibana to be available..."
    sleep 15
  else
    echo "Kibana is available."
    break
  fi
done

# Removing the https:// part of the url provided in order to use it in the command below.
FORMATTED_ES_URL="${ES_URL/https:\/\//}"
FORMATTED_KB_URL="${KB_URL/https:\/\//}"

# Find a way to remove this in the future
# This is used in order to wait for the environment to be ready.
sleep 150

TEST_CLOUD=1 TEST_ES_URL="https://elastic:$PASSWORD@$FORMATTED_ES_URL:443" TEST_KIBANA_URL="https://elastic:$PASSWORD@$FORMATTED_KB_URL:443" yarn run $1
cmd_status=$?
echo "Exit code with status: $cmd_status"

curl --location --request DELETE "$QA_CONSOLE_URL/api/v1/serverless/projects/security/$ID" \
  --header "Authorization: ApiKey $QA_API_KEY"

exit $cmd_status
