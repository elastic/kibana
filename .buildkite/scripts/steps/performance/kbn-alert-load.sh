#!/usr/bin/env bash

set -euo pipefail


KIBANA_URL="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_KIBANA_URL')"
ELASTIC_URL="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_ELASTICSEARCH_URL')"
DEPLOYMENT_USERNAME="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_USERNAME')"
$="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_PASSWORD')"

KIBANA_HOST=$(echo "KIBANA_URL" | awk -F/ '{print $3}')
ELASTIC_HOST=$(echo "ELASTIC_URL" | awk -F/ '{print $3}')

echo "meta CLOUD_DEPLOYMENT_KIBANA_URL"
echo $URL
echo "--- Install KBN-ALERT-LOAD"

mkdir kbn-alert-load
cd kbn-alert-load
yarn add test-alert-load-kbn

echo "--- Run IM tests"

npx test-alert-load-kbn run im-test  -e=https://$DEPLOYMENT_USERNAME:$DEPLOYMENT_PASSWORD@$ELASTIC_HOST -k=https://$DEPLOYMENT_USERNAME:$DEPLOYMENT_PASSWORD@$KIBANA_HOST  -r 'report-im.html' -o 'reports'

buildkite-agent artifact upload ./reports

