#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/env.sh

BEATS_MANIFEST_RESPONSE=$(curl -sf "$BEATS_MANIFEST_LATEST") || {
  echo "Failed to fetch beats manifest from $BEATS_MANIFEST_LATEST (HTTP error or connection failure)"
  exit 1
}
if [ -z "$BEATS_MANIFEST_RESPONSE" ]; then
  echo "Empty response from $BEATS_MANIFEST_LATEST"
  exit 1
fi
echo "Beats manifest response: $BEATS_MANIFEST_RESPONSE"
BEATS_MANIFEST_LATEST_URL=$(echo "$BEATS_MANIFEST_RESPONSE" | jq -r '.manifest_url')

KIBANA_MANIFEST_RESPONSE=$(curl -sf "$KIBANA_MANIFEST_LATEST") || {
  echo "Failed to fetch kibana manifest from $KIBANA_MANIFEST_LATEST (HTTP error or connection failure)"
  exit 1
}
if [ -z "$KIBANA_MANIFEST_RESPONSE" ]; then
  echo "Empty response from $KIBANA_MANIFEST_LATEST"
  exit 1
fi
echo "Kibana manifest response: $KIBANA_MANIFEST_RESPONSE"
KIBANA_MANIFEST_URL=$(echo "$KIBANA_MANIFEST_RESPONSE" | jq -r '.manifest_url')

KIBANA_MANIFEST_FULL_RESPONSE=$(curl -sf "$KIBANA_MANIFEST_URL") || {
  echo "Failed to fetch full kibana manifest from $KIBANA_MANIFEST_URL (HTTP error or connection failure)"
  exit 1
}
if [ -z "$KIBANA_MANIFEST_FULL_RESPONSE" ]; then
  echo "Empty response from $KIBANA_MANIFEST_URL"
  exit 1
fi
KIBANA_BEATS_MANIFEST_URL=$(echo "$KIBANA_MANIFEST_FULL_RESPONSE" | jq -r '.projects.kibana.dependencies[] | select(.prefix == "beats") | .build_uri')

echo "--- Trigger artifact builds"
if [ "$BEATS_MANIFEST_LATEST_URL" = "$KIBANA_BEATS_MANIFEST_URL" ]; then
  echo "Kibana has the latest version of beats, skipping trigger"
else
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-staging "$BUILDKITE_BRANCH"
fi
