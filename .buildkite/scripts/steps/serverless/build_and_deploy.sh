#!/bin/bash

set -euo pipefail


source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/docker_image.sh


deploy() {
  PROJECT_TYPE=$1
  case $PROJECT_TYPE in
    elasticsearch)
      PROJECT_TYPE_LABEL='Elasticsearch Serverless'
    ;;
    observability)
      PROJECT_TYPE_LABEL='Observability'
    ;;
    security)
      PROJECT_TYPE_LABEL='Security'
    ;;
  esac

  PROJECT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST-$PROJECT_TYPE"
  VAULT_KEY_NAME="$PROJECT_NAME"
  is_pr_with_label "ci:project-persist-deployment" && PROJECT_NAME="keep_$PROJECT_NAME"
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

  echo "--- Create $PROJECT_TYPE_LABEL project"
  DEPLOY_LOGS=$(mktemp --suffix ".json")

  echo "Checking if project already exists..."
  curl -s \
    -H "Authorization: ApiKey $PROJECT_API_KEY" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
    -XGET &>> $DEPLOY_LOGS

  PROJECT_ID=$(jq -r --slurp '[.[0].items[] | select(.name == "'$PROJECT_NAME'")] | .[0].id' $DEPLOY_LOGS)
  if is_pr_with_label "ci:project-redeploy"; then
    if [ -z "${PROJECT_ID}" ]; then
      echo "No project to remove"
    else
      echo "Shutting down previous project..."
      curl -s \
        -H "Authorization: ApiKey $PROJECT_API_KEY" \
        -H "Content-Type: application/json" \
        "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}" \
        -XDELETE > /dev/null
      PROJECT_ID='null'
    fi
  fi

  if [ -z "${PROJECT_ID}" ] || [ "$PROJECT_ID" = 'null' ]; then
    echo "Creating project..."
    curl -s \
      -H "Authorization: ApiKey $PROJECT_API_KEY" \
      -H "Content-Type: application/json" \
      "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
      -XPOST -d "$PROJECT_CREATE_CONFIGURATION" &>> $DEPLOY_LOGS

    PROJECT_ID=$(jq -r --slurp '.[1].id' $DEPLOY_LOGS)
    if [ -z "${PROJECT_ID}" ] || [ "$PROJECT_ID" = 'null' ]; then
      echo "Failed to create project. Deploy logs:"
      cat $DEPLOY_LOGS
      exit 1
    fi

    echo "Get credentials..."
    curl -s -XPOST -H "Authorization: ApiKey $PROJECT_API_KEY" \
      "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}/_reset-internal-credentials" &>> $DEPLOY_LOGS

    PROJECT_USERNAME=$(jq -r --slurp '.[2].username' $DEPLOY_LOGS)
    PROJECT_PASSWORD=$(jq -r --slurp '.[2].password' $DEPLOY_LOGS)

    echo "Write to vault..."
    VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
    VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
    VAULT_TOKEN=$(retry 5 30 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
    retry 5 30 vault login -no-print "$VAULT_TOKEN"

    # TODO: remove after https://github.com/elastic/kibana-operations/issues/15 is done
    if [[ "$IS_LEGACY_VAULT_ADDR" == "true" ]]; then
      vault_set "cloud-deploy/$VAULT_KEY_NAME" username="$PROJECT_USERNAME" password="$PROJECT_PASSWORD" id="$PROJECT_ID"
    else
      vault_kv_set "cloud-deploy/$VAULT_KEY_NAME" username="$PROJECT_USERNAME" password="$PROJECT_PASSWORD" id="$PROJECT_ID"
    fi

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

  # TODO: remove after https://github.com/elastic/kibana-operations/issues/15 is done
  if [[ "$IS_LEGACY_VAULT_ADDR" == "true" ]]; then
    VAULT_READ_COMMAND="vault read $VAULT_PATH_PREFIX/cloud-deploy/$VAULT_KEY_NAME"
  else
    VAULT_READ_COMMAND="vault kv get $VAULT_KV_PREFIX/cloud-deploy/$VAULT_KEY_NAME"
  fi

  cat << EOF | buildkite-agent annotate --style "info" --context "project-$PROJECT_TYPE"
### $PROJECT_TYPE_LABEL Deployment

Kibana: $PROJECT_KIBANA_LOGIN_URL

Elasticsearch: $PROJECT_ELASTICSEARCH_URL

Credentials: \`$VAULT_READ_COMMAND\`

Kibana image: \`$KIBANA_IMAGE\`
EOF

  buildkite-agent meta-data set "pr_comment:deploy_project_$PROJECT_TYPE:head" "* [$PROJECT_TYPE_LABEL Deployment](${PROJECT_KIBANA_LOGIN_URL})"
  buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
}

# This is the integration with the observability-test-environments
create_github_issue_oblt_test_environments() {

echo "--- Create GitHub issue for deploying in the oblt test env"

GITHUB_ISSUE=$(mktemp --suffix ".md") 
cat <<EOF > "$GITHUB_ISSUE"
### Kibana image

$KIBANA_IMAGE

### Kibana pull request

$BUILDKITE_PULL_REQUEST

### Further details

Caused by @$GITHUB_PR_TRIGGER_USER using the github label in https://github.com/elastic/kibana/pull/$BUILDKITE_PULL_REQUEST
EOF

  GH_TOKEN="$GITHUB_TOKEN" \
  gh issue create \
    --title "[Deploy Serverless Kibana] for user $GITHUB_PR_TRIGGER_USER with PR kibana@pr-$BUILDKITE_PULL_REQUEST" \
    --body-file "${GITHUB_ISSUE}" \
    --label 'deploy-custom-kibana-serverless' \
    --repo 'elastic/observability-test-environments' \
    --assignee "$GITHUB_PR_OWNER"
}

is_pr_with_label "ci:project-deploy-elasticsearch" && deploy "elasticsearch"
if is_pr_with_label "ci:project-deploy-observability" ; then
  create_github_issue_oblt_test_environments
  echo "--- Deploy observability with Kibana CI"
  deploy "observability"
fi
is_pr_with_label "ci:project-deploy-security" && deploy "security"

exit 0;
