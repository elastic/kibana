#!/usr/bin/env bash

set -euo pipefail
source .buildkite/scripts/common/util.sh

CLOUD_DEPLOYMENT_NAME="kibana-pr-$BUILDKITE_PULL_REQUEST"

# KIBANA_URL="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_KIBANA_URL')"
# ELASTIC_URL="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_ELASTICSEARCH_URL')"


DEPLOYMENT_USERNAME="$(retry 5 5 vault read -field=username secret/kibana-issues/dev/cloud-deploy/$CLOUD_DEPLOYMENT_NAME)"
DEPLOYMENT_PASSWORD="$(retry 5 5 vault read -field=password secret/kibana-issues/dev/cloud-deploy/$CLOUD_DEPLOYMENT_NAME)"

if [ -z "$DEPLOYMENT_USERNAME" ]
then
      echo "\$DEPLOYMENT_USERNAME is empty"
else
      echo "\$DEPLOYMENT_USERNAME is NOT empty"
fi

KIBANA_HOST=$(echo "KIBANA_URL" | awk -F/ '{print $3}')
ELASTIC_HOST=$(echo "ELASTIC_URL" | awk -F/ '{print $3}')
TEST_ALERT_LOAD_KBN_ES=https://$DEPLOYMENT_USERNAME:$DEPLOYMENT_PASSWORD@$ELASTIC_HOST
TEST_ALERT_LOAD_KBN_KB=https://$DEPLOYMENT_USERNAME:$DEPLOYMENT_PASSWORD@$KIBANA_HOST

echo "meta CLOUD_DEPLOYMENT_KIBANA_URL"
echo $URL
echo "--- Install KBN-ALERT-LOAD"

mkdir kbn-alert-load
cd kbn-alert-load
yarn add test-alert-load-kbn

echo "--- Run IM tests"

# npx test-alert-load-kbn run im-test  -r 'report-im.html' -o 'reports'

# buildkite-agent artifact upload './reports'

