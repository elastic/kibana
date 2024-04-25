#!/bin/bash
if [ -z "$1" ]
  then
    echo "No target script from the package.json file, is supplied"
    exit 1
fi

# source .buildkite/scripts/common/util.sh
# .buildkite/scripts/bootstrap.sh

# buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" "true"

source .buildkite/scripts/pipelines/security_solution_quality_gate/prepare_vault_entries.sh

cd x-pack/test/security_solution_api_integration
# set +e

# Generate a random 5-digit number
random_number=$((10000 + $RANDOM % 90000))
PROXY_URL="https://cloud-handler-test-r344edqiza-uc.a.run.app"
# Check the healthcheck of the proxy service
response=$(curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL/healthcheck")
echo "Proxy Healthcheck Response code: $response"

if [ "$response" -eq 200 ]; then
  # Proxy service is up and running. Use the proxy to handle the projects.
  CREATE_URL="$PROXY_URL/projects"
  RESET_CREDS_URL="$PROXY_URL/projects/{project_id}/_reset-internal-credentials"
  DELETE_URL="$PROXY_URL/projects/{project_id}"
  AUTH="Basic $(vault_get security-solution-quality-gate-proxy base_64_encoded_auth)"
else
  # Proxy service is not available. Use default single org execution mode using cloud QA directly.
  CREATE_URL="$QA_CONSOLE_URL/api/v1/serverless/projects/security"
  RESET_CREDS_URL="$QA_CONSOLE_URL/api/v1/serverless/projects/security/{project_id}/_reset-internal-credentials"
  DELETE_URL="$QA_CONSOLE_URL/api/v1/serverless/projects/security/{project_id}"
  AUTH="ApiKey $CLOUD_QA_API_KEY"
fi


if [ -z "${KIBANA_MKI_IMAGE_COMMIT+x}" ]; then
  # There is no provided commit to be used so running against whatever image
  # is already qualified in Cloud QA.
  ENVIRONMENT_DETAILS=$(curl --location "$CREATE_URL" \
    --header "Authorization: $AUTH" \
    --header 'Content-Type: application/json' \
    --data '{
          "name": "ftr-integration-tests-'$random_number'",
          "region_id": "aws-eu-west-1"}' | jq '.')
else
  # A commit is provided so it will be used to run the tests against this qualified image.
  KBN_COMMIT_HASH=${KIBANA_MKI_IMAGE_COMMIT:0:12}
  ENVIRONMENT_DETAILS=$(curl --location "$CREATE_URL" \
    --header "Authorization: $AUTH" \
    --header 'Content-Type: application/json' \
    --data '{
          "name": "ftr-integration-tests-'$random_number'",
          "region_id": "aws-eu-west-1",
          "overrides": {
            "kibana": {
              "docker_image" : "docker.elastic.co/kibana-ci/kibana-serverless:git-'$KBN_COMMIT_HASH'"
              }
            }
          }' | jq '.')
fi

if [ "$response" -eq 200 ]; then
  # Proxy is up and running so reading the ES and KB endpoints from the proxy response. 
  ES_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.elasticsearch_endpoint')
  KB_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.kibana_endpoint')
  ID=$(echo $ENVIRONMENT_DETAILS | jq -r '.project_id')
else
  # Proxy is unavailable so reading the ES and KB endpoints from the cloud QA response. 
  ES_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.endpoints.elasticsearch')
  KB_URL=$(echo $ENVIRONMENT_DETAILS | jq -r '.endpoints.kibana')
  ID=$(echo $ENVIRONMENT_DETAILS | jq -r '.id')
fi
NAME=$(echo $ENVIRONMENT_DETAILS | jq -r '.name')

# Wait five seconds for the project to appear
sleep 5

# Resetting the credentials of the elastic user in the project
RESET_CREDENTIALS_URL=$(echo "$RESET_CREDS_URL" | sed "s/{project_id}/$ID/g")
CREDS_BODY=$(curl -s --location --request POST "$RESET_CREDENTIALS_URL" \
  --header "Authorization: $AUTH" \
  --header 'Content-Type: application/json' | jq '.')
USERNAME=$(echo $CREDS_BODY | jq -r '.username')
PASSWORD=$(echo $CREDS_BODY | jq -r '.password')
PROJECT_AUTH=$(echo "$USERNAME:$PASSWORD")

# Checking if Elasticsearch has status green
while : ; do
  STATUS=$(curl -u $PROJECT_AUTH --location "$ES_URL:443/_cluster/health?wait_for_status=green&timeout=50s" | jq -r '.status')
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
  STATUS=$(curl -u $PROJECT_AUTH --location "$KB_URL:443/api/status" | jq -r '.status.overall.level')
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

echo "--- Triggering API tests for $1"
TEST_CLOUD=1 TEST_ES_URL="https://$USERNAME:$PASSWORD@$FORMATTED_ES_URL:443" TEST_KIBANA_URL="https://$USERNAME:$PASSWORD@$FORMATTED_KB_URL:443" yarn run $1
cmd_status=$?
echo "Exit code with status: $cmd_status"

DELETE_PROJECT_URL=$(echo "$DELETE_URL" | sed "s/{project_id}/$ID/g")
curl --location --request DELETE  "$DELETE_PROJECT_URL" \
  --header "Authorization: $AUTH"

exit $cmd_status
