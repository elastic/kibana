#!/bin/bash

set -euo pipefail


source .buildkite/scripts/common/util.sh

KIBANA_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless:pr-$BUILDKITE_PULL_REQUEST-${BUILDKITE_COMMIT:0:12}"

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

  echo "Checking if project already exists..."
  PROJECT_DEPLOY_LOGS=$(mktemp --suffix ".json")
  PROJECT_EXISTS_LOGS=$(mktemp --suffix ".json")
  PROJECT_INFO_LOGS=$(mktemp --suffix ".json")

  curl -s --fail \
    -H "Authorization: ApiKey $PROJECT_API_KEY" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
    -XGET &> $PROJECT_EXISTS_LOGS

  PROJECT_ID=$(jq -r '[.items[] | select(.name == "'$PROJECT_NAME'")] | .[0].id' $PROJECT_EXISTS_LOGS)
  if is_pr_with_label "ci:project-redeploy"; then
    if [ -z "${PROJECT_ID}" ]; then
      echo "No project to remove"
    else
      echo "Shutting down previous project..."
      curl -s --fail \
        -H "Authorization: ApiKey $PROJECT_API_KEY" \
        -H "Content-Type: application/json" \
        "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}" \
        -XDELETE > /dev/null
      PROJECT_ID='null'
    fi
  fi

  if [ -z "${PROJECT_ID}" ] || [ "$PROJECT_ID" = 'null' ]; then
    echo "Creating project..."
    curl -s --fail \
      -H "Authorization: ApiKey $PROJECT_API_KEY" \
      -H "Content-Type: application/json" \
      "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}" \
      -XPOST -d "$PROJECT_CREATE_CONFIGURATION" &> $PROJECT_DEPLOY_LOGS

    PROJECT_ID=$(jq -r '.id' $PROJECT_DEPLOY_LOGS)
    if [ -z "${PROJECT_ID}" ] || [ "$PROJECT_ID" = 'null' ]; then
      echo "Failed to create project. Deploy logs:"
      cat $PROJECT_DEPLOY_LOGS
      exit 1
    fi
    PROJECT_USERNAME=$(jq -r '.credentials.username' $PROJECT_DEPLOY_LOGS)
    PROJECT_PASSWORD=$(jq -r '.credentials.password' $PROJECT_DEPLOY_LOGS)

    echo "Write to vault..."

    set_in_legacy_vault "$VAULT_KEY_NAME" \
     username="$PROJECT_USERNAME" \
     password="$PROJECT_PASSWORD" \
     id="$PROJECT_ID"

  else
    echo "Updating project..."
    curl -s --fail \
      -H "Authorization: ApiKey $PROJECT_API_KEY" \
      -H "Content-Type: application/json" \
      "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}" \
      -XPATCH -d "$PROJECT_UPDATE_CONFIGURATION" &> $PROJECT_DEPLOY_LOGS
  fi

  echo "Getting project info..."
  curl -s --fail \
    -H "Authorization: ApiKey $PROJECT_API_KEY" \
    "${PROJECT_API_DOMAIN}/api/v1/serverless/projects/${PROJECT_TYPE}/${PROJECT_ID}" \
    -XGET &> $PROJECT_INFO_LOGS

  PROJECT_KIBANA_URL=$(jq -r '.endpoints.kibana' $PROJECT_INFO_LOGS)
  PROJECT_KIBANA_LOGIN_URL="${PROJECT_KIBANA_URL}/login"
  PROJECT_ELASTICSEARCH_URL=$(jq -r '.endpoints.elasticsearch' $PROJECT_INFO_LOGS)

  VAULT_READ_COMMAND=$(print_legacy_vault_read "$VAULT_KEY_NAME")

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

Caused by the GitHub label 'ci:project-deploy-observability' in https://github.com/elastic/kibana/pull/$BUILDKITE_PULL_REQUEST
EOF

  GH_TOKEN="$GITHUB_TOKEN" \
  gh issue create \
    --title "[Deploy Serverless Kibana] for user $GITHUB_PR_TRIGGER_USER with PR kibana@pr-$BUILDKITE_PULL_REQUEST" \
    --body-file "${GITHUB_ISSUE}" \
    --label 'deploy-custom-kibana-serverless' \
    --repo 'elastic/observability-test-environments'
}

is_pr_with_label "ci:project-deploy-elasticsearch" && deploy "elasticsearch"
if is_pr_with_label "ci:project-deploy-observability" ; then
  # Only deploy observability if the PR is targeting main
  if [[ "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" == "main" ]]; then
    create_github_issue_oblt_test_environments
    echo "--- Deploy observability with Kibana CI"
    deploy "observability"
  fi
fi
is_pr_with_label "ci:project-deploy-security" && deploy "security"

exit 0;
