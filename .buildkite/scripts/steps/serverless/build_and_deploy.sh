#!/bin/bash

set -euo pipefail


source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/docker_image.sh

PROJECT_TYPE=""
is_pr_with_label "ci:project-deploy-elasticsearch" && PROJECT_TYPE="elasticsearch"
is_pr_with_label "ci:project-deploy-observability" && PROJECT_TYPE="observability"
is_pr_with_label "ci:project-deploy-security" && PROJECT_TYPE="security"
if [ -z "${PROJECT_TYPE}" ]; then
  echo "Mising project type"
  exit 10
fi

PROJECT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST-$PROJECT_TYPE"
PROJECT_CREATE_CONFIGURATION='{
  "name": "'"$PROJECT_NAME"'",
  "region_id": "aws-eu-west-1",
  "overrides": {
      "kibana": {
          "docker_image": "'"$KIBANA_IMAGE"'"
      }
  }
}'
PROJECT_UPDATE_CONFIGURATION='{
  "name": "'"$PROJECT_NAME"'",
  "overrides": {
      "kibana": {
          "docker_image": "'"$KIBANA_IMAGE"'"
      }
  }
}'

echo "--- Create project"
DEPLOY_LOGS=$(mktemp --suffix ".json")

echo "Checking if project already exists..."
curl -s \
  -H "Authorization: ApiKey $PROJECT_API_KEY" \
  "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
  -XGET &>> $DEPLOY_LOGS

PROJECT_ID=$(jq -r --slurp '[.[0].items[] | select(.name == "'$PROJECT_NAME'")] | .[0].id' $DEPLOY_LOGS)
if [ -z "${PROJECT_ID}" ] || [ "$PROJECT_ID" = 'null' ]; then
  echo "Creating project..."
  curl -s \
    -H "Authorization: ApiKey $PROJECT_API_KEY" \
    -H "Content-Type: application/json" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
    -XPOST -d "$PROJECT_CREATE_CONFIGURATION" &>> $DEPLOY_LOGS

  PROJECT_ID=$(jq -r --slurp '.[1].id' $DEPLOY_LOGS)

  echo "Get credentials..."
  curl -s -XPOST -H "Authorization: ApiKey $PROJECT_API_KEY" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}/_reset-credentials" &>> $DEPLOY_LOGS

  PROJECT_USERNAME=$(jq -r --slurp '.[2].username' $DEPLOY_LOGS)
  PROJECT_PASSWORD=$(jq -r --slurp '.[2].password' $DEPLOY_LOGS)

  echo "Write to vault..."
  VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
  VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
  VAULT_TOKEN=$(retry 5 30 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
  retry 5 30 vault login -no-print "$VAULT_TOKEN"
  retry 5 5 vault write "secret/kibana-issues/dev/cloud-deploy/$PROJECT_NAME" username="$PROJECT_USERNAME" password="$PROJECT_PASSWORD" id="$PROJECT_ID"
else
  echo "Updating project..."
  curl -s \
    -H "Authorization: ApiKey $PROJECT_API_KEY" \
    -H "Content-Type: application/json" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}" \
    -XPUT -d "$PROJECT_UPDATE_CONFIGURATION" &>> $DEPLOY_LOGS
fi

PROJECT_KIBANA_URL=$(jq -r --slurp '.[1].endpoints.kibana' $DEPLOY_LOGS)
PROJECT_KIBANA_LOGIN_URL="${PROJECT_KIBANA_URL}/login"
PROJECT_ELASTICSEARCH_URL=$(jq -r --slurp '.[1].endpoints.elasticsearch' $DEPLOY_LOGS)

cat << EOF | buildkite-agent annotate --style "info" --context project
  ### Project Deployment

  Kibana: $PROJECT_KIBANA_LOGIN_URL

  Elasticsearch: $PROJECT_ELASTICSEARCH_URL

  Credentials: \`vault read secret/kibana-issues/dev/cloud-deploy/$PROJECT_NAME\`

  Kibana image: \`$KIBANA_IMAGE\`
EOF

buildkite-agent meta-data set pr_comment:deploy_project:head "* [Project Deployment](${PROJECT_KIBANA_LOGIN_URL})"
buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
