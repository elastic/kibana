#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/env.sh

BEATS_MANIFEST_LATEST_RESPONSE=$(curl --silent --show-error --fail "$BEATS_MANIFEST_LATEST") || {
  echo "Failed to curl $BEATS_MANIFEST_LATEST" >&2; exit 1
}
BEATS_MANIFEST_LATEST_URL=$(echo "$BEATS_MANIFEST_LATEST_RESPONSE" | jq -re '.manifest_url') || {
  echo "Failed to parse .manifest_url from $BEATS_MANIFEST_LATEST response" >&2; exit 1
}

KIBANA_MANIFEST_RESPONSE=$(curl --silent --show-error --fail "$KIBANA_MANIFEST_LATEST") || {
  echo "Failed to curl $KIBANA_MANIFEST_LATEST" >&2; exit 1
}
KIBANA_MANIFEST_URL=$(echo "$KIBANA_MANIFEST_RESPONSE" | jq -re '.manifest_url') || {
  echo "Failed to parse .manifest_url from $KIBANA_MANIFEST_LATEST response" >&2; exit 1
}

KIBANA_MANIFEST_DETAIL_RESPONSE=$(curl --silent --show-error --fail "$KIBANA_MANIFEST_URL") || {
  echo "Failed to curl $KIBANA_MANIFEST_URL" >&2; exit 1
}
KIBANA_BEATS_MANIFEST_URL=$(echo "$KIBANA_MANIFEST_DETAIL_RESPONSE" | jq -re '.projects.kibana.dependencies[] | select(.prefix == "beats") | .build_uri') || {
  echo "Failed to parse beats build_uri from $KIBANA_MANIFEST_URL response" >&2; exit 1
}

echo "--- Trigger artifact builds"
if [ "$BEATS_MANIFEST_LATEST_URL" = "$KIBANA_BEATS_MANIFEST_URL" ]; then
  echo "Kibana has the latest version of beats, skipping trigger"
else
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-staging "$BUILDKITE_BRANCH"
fi
