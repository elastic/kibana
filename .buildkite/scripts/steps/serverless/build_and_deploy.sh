#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/docker_image.sh

PROJECT_TYPE=""
is_pr_with_label "ci:project-deploy-es" && PROJECT_TYPE="elasticsearch"
is_pr_with_label "ci:project-deploy-oblt" && PROJECT_TYPE="observability"
is_pr_with_label "ci:project-deploy-security" && PROJECT_TYPE="security"
if [ -z "${PROJECT_TYPE}" ]; then
  echo "Mising project type"
  exit 10
fi
PROJECT_NAME="kibana-$PROJECT_TYPE-pr-$BUILDKITE_PULL_REQUEST"

echo "--- Create project"
DEPLOY_LOGS=$(mktemp --suffix ".json")

echo "Creating project..."
curl -s \
  -H "Authorization: ApiKey $PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
  -XPOST -d '{
    "name": "'"$PROJECT_NAME"'",
    "region_id": "aws-eu-west-1",
    "overrides": {
        "kibana": {
            "docker_image": "'"$KIBANA_IMAGE"'"
        }
    }
  }' &>> $DEPLOY_LOGS

PROJECT_KIBANA_URL=$(jq -r --slurp '.[0].endpoints.kibana' $DEPLOY_LOGS)
PROJECT_ELASTICSEARCH_URL=$(jq -r --slurp '.[0].endpoints.elasticsearch' $DEPLOY_LOGS)
PROJECT_ID=$(jq -r --slurp '.[0].id' $DEPLOY_LOGS)

echo "Get credentials..."
curl -s -XPOST -H "Authorization: ApiKey $PROJECT_API_KEY" \
  "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}/_reset-credentials" &>> $DEPLOY_LOGS

PROJECT_USERNAME=$(jq -r --slurp '.[1].username' $DEPLOY_LOGS)
PROJECT_PASSWORD=$(jq -r --slurp '.[1].password' $DEPLOY_LOGS)

echo "Write to vault..."
VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
VAULT_TOKEN=$(retry 5 30 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
retry 5 30 vault login -no-print "$VAULT_TOKEN"
retry 5 5 vault write "secret/kibana-issues/dev/cloud-deploy/$PROJECT_NAME" username="$PROJECT_USERNAME" password="$PROJECT_PASSWORD" id="$PROJECT_ID"

cat << EOF | buildkite-agent annotate --style "info" --context project
  ### Project Deployment

  Kibana: $PROJECT_KIBANA_URL

  Elasticsearch: $PROJECT_ELASTICSEARCH_URL

  Credentials: \`vault read secret/kibana-issues/dev/cloud-deploy/$PROJECT_NAME\`

  Kibana image: \`$KIBANA_IMAGE\`
EOF

buildkite-agent meta-data set pr_comment:deploy_cloud:head "* [Project Deployment](${PROJECT_KIBANA_URL})"
buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
