#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

export KBN_NP_PLUGINS_BUILT=true

VERSION="$(jq -r '.version' package.json)-SNAPSHOT"
ECCTL_LOGS=$(mktemp --suffix ".json")

echo "--- Download Kibana Distribution"

mkdir -p ./target
download_artifact "kibana-$VERSION-linux-x86_64.tar.gz" ./target --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

echo "--- Build Cloud Distribution"
ELASTICSEARCH_MANIFEST_URL="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/$(jq -r '.version' package.json)/manifest-latest-verified.json"
ELASTICSEARCH_SHA=$(curl -s $ELASTICSEARCH_MANIFEST_URL | jq -r '.sha')
ELASTICSEARCH_CLOUD_IMAGE="docker.elastic.co/kibana-ci/elasticsearch-cloud-ess:$VERSION-$ELASTICSEARCH_SHA"

KIBANA_CLOUD_IMAGE="docker.elastic.co/kibana-ci/kibana-cloud:$VERSION-$GIT_COMMIT"
CLOUD_DEPLOYMENT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST"

set +e
DISTRIBUTION_EXISTS=$(docker manifest inspect $KIBANA_CLOUD_IMAGE &> /dev/null; echo $?)
set -e

if  [ $DISTRIBUTION_EXISTS -eq 0 ]; then
  echo "Distribution already exists, skipping build"
else
  node scripts/build \
    --skip-initialize \
    --skip-generic-folders \
    --skip-platform-folders \
    --skip-archives \
    --skip-cdn-assets \
    --docker-images \
    --docker-tag-qualifier="$GIT_COMMIT" \
    --docker-push \
    --skip-docker-ubi \
    --skip-docker-fips \
    --skip-docker-ubuntu \
    --skip-docker-wolfi \
    --skip-docker-serverless \
    --skip-docker-contexts
fi

if is_pr_with_label "ci:cloud-redeploy"; then
  echo "--- Shutdown Previous Deployment"
  CLOUD_DEPLOYMENT_ID=$(ecctl deployment list --output json | jq -r '.deployments[] | select(.name == "'$CLOUD_DEPLOYMENT_NAME'") | .id')
  if [ -z "${CLOUD_DEPLOYMENT_ID}" ] || [ "${CLOUD_DEPLOYMENT_ID}" == "null" ]; then
    echo "No deployment to remove"
  else
    echo "Shutting down previous deployment..."
    ecctl deployment shutdown "$CLOUD_DEPLOYMENT_ID" --force --track --output json > "$ECCTL_LOGS"
  fi
fi

echo "--- Create Deployment"
CLOUD_DEPLOYMENT_ID=$(ecctl deployment list --output json | jq -r '.deployments[] | select(.name == "'$CLOUD_DEPLOYMENT_NAME'") | .id')
if [ -z "${CLOUD_DEPLOYMENT_ID}" ] || [ "${CLOUD_DEPLOYMENT_ID}" = 'null' ]; then
  jq '
    .resources.kibana[0].plan.kibana.docker_image = "'$KIBANA_CLOUD_IMAGE'" |
    .resources.elasticsearch[0].plan.elasticsearch.docker_image = "'$ELASTICSEARCH_CLOUD_IMAGE'" |
    .name = "'$CLOUD_DEPLOYMENT_NAME'" |
    .resources.kibana[0].plan.kibana.version = "'$VERSION'" |
    .resources.elasticsearch[0].plan.elasticsearch.version = "'$VERSION'" |
    .resources.integrations_server[0].plan.integrations_server.version = "'$VERSION'"
    ' .buildkite/scripts/steps/cloud/deploy.json > /tmp/deploy.json

  echo "Creating deployment..."
  ecctl deployment create --track --output json --file /tmp/deploy.json > "$ECCTL_LOGS"

  CLOUD_DEPLOYMENT_USERNAME=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.username' "$ECCTL_LOGS")
  CLOUD_DEPLOYMENT_PASSWORD=$(jq --slurp '.[]|select(.resources).resources[] | select(.credentials).credentials.password' "$ECCTL_LOGS")
  CLOUD_DEPLOYMENT_ID=$(jq -r --slurp '.[0].id' "$ECCTL_LOGS")
  CLOUD_DEPLOYMENT_STATUS_MESSAGES=$(jq --slurp '[.[]|select(.resources == null)]' "$ECCTL_LOGS")

  echo "Writing to vault..."

  set_in_legacy_vault "$CLOUD_DEPLOYMENT_NAME" \
    username="$CLOUD_DEPLOYMENT_USERNAME" \
    password="$CLOUD_DEPLOYMENT_PASSWORD"

  echo "Enabling Stack Monitoring..."
  jq '
    .settings.observability.metrics.destination.deployment_id = "'$CLOUD_DEPLOYMENT_ID'" |
    .settings.observability.logging.destination.deployment_id = "'$CLOUD_DEPLOYMENT_ID'"
    ' .buildkite/scripts/steps/cloud/stack_monitoring.json > /tmp/stack_monitoring.json

  # After a deployment is created, a new Kibana plan is automatically added to update settings
  # and restart Kibana.  Polling for a plan state isn't especially reliable because it flips
  # between empty and queued, and then empty again depending on how quickly setup is run in cloud.
  # We want to enable monitoring after the automatic plan has run, if not we get an error:
  # * deployments.resource_plan_state_error: Kibana resource [main-kibana] has a plan still pending, cancel that or wait for it to complete (settings.observability.plan)
  # This adds a sleep and retry to see if we can make this step more reliable
  sleep 120
  retry 5 60 ecctl deployment update "$CLOUD_DEPLOYMENT_ID" --track --output json --file /tmp/stack_monitoring.json > "$ECCTL_LOGS"

  echo "Enabling verbose logging..."
  ecctl deployment show "$CLOUD_DEPLOYMENT_ID" --generate-update-payload | jq '
    .resources.kibana[0].plan.kibana.user_settings_yaml = "logging.root.level: all"
    ' > /tmp/verbose_logging.json
  ecctl deployment update "$CLOUD_DEPLOYMENT_ID" --track --output json --file /tmp/verbose_logging.json > "$ECCTL_LOGS"
else
  ecctl deployment show "$CLOUD_DEPLOYMENT_ID" --generate-update-payload | jq '
    .resources.kibana[0].plan.kibana.docker_image = "'$KIBANA_CLOUD_IMAGE'" |
    (.. | select(.version? != null).version) = "'$VERSION'"
    ' > /tmp/deploy.json

  echo "Updating deployment..."
  ecctl deployment update "$CLOUD_DEPLOYMENT_ID" --track --output json --file /tmp/deploy.json > "$ECCTL_LOGS"
fi

VAULT_READ_COMMAND=$(print_legacy_vault_read "$CLOUD_DEPLOYMENT_NAME")

CLOUD_DEPLOYMENT_KIBANA_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.kibana[0].info.metadata.aliased_url')
CLOUD_DEPLOYMENT_ELASTICSEARCH_URL=$(ecctl deployment show "$CLOUD_DEPLOYMENT_ID" | jq -r '.resources.elasticsearch[0].info.metadata.aliased_url')

cat << EOF | buildkite-agent annotate --style "info" --context cloud
### Cloud Deployment

Kibana: $CLOUD_DEPLOYMENT_KIBANA_URL

Elasticsearch: $CLOUD_DEPLOYMENT_ELASTICSEARCH_URL

Credentials: \`$VAULT_READ_COMMAND\`

Kibana image: \`$KIBANA_CLOUD_IMAGE\`

Elasticsearch image: \`$ELASTICSEARCH_CLOUD_IMAGE\`
EOF

buildkite-agent meta-data set pr_comment:deploy_cloud:head "* [Cloud Deployment](${CLOUD_DEPLOYMENT_KIBANA_URL})"
buildkite-agent meta-data set pr_comment:early_comment_job_id "$BUILDKITE_JOB_ID"
