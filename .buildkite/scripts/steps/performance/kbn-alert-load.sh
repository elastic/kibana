#!/usr/bin/env bash

set -euo pipefail

echo "env CLOUD_DEPLOYMENT_KIBANA_URL"

echo $CLOUD_DEPLOYMENT_KIBANA_URL


URL="$(buildkite-agent meta-data get 'META_CLOUD_DEPLOYMENT_KIBANA_URL')"
echo "meta CLOUD_DEPLOYMENT_KIBANA_URL"
echo $URL
echo "--- Install KBN-ALERT-LOAD"

mkdir kbn-alert-load
cd kbn-alert-load
yarn add test-alert-load-kbn

echo "--- Run IM tests"

npx test-alert-load-kbn run im-test

