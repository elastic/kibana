#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/env.sh

function get_prop_safe() {
  local json_url=$1
  local prop=$2

  local json_content=$(curl "$json_url")

  if jq -e . >/dev/null 2>&1 <<<"$json_content"; then
    echo "$json_content" | jq -r "$prop"
  else
    echo "Error: $json_url is not valid json" >&2
    echo "$json_content" >&2
    jq -e . >/dev/null <<< "$json_content"
  fi
}

BEATS_MANIFEST_LATEST_URL=$(get_prop_safe  "$BEATS_MANIFEST_LATEST" '.json_url')
KIBANA_MANIFEST_URL=$(get_prop_safe  "$KIBANA_MANIFEST_LATEST" '.json_url')
KIBANA_BEATS_MANIFEST_URL=$(get_prop_safe $KIBANA_MANIFEST_URL '.projects.kibana.dependencies[] | select(.prefix == "beats") | .build_uri')

echo "--- Trigger artifact builds"
if [ "$BEATS_MANIFEST_LATEST_URL" = "$KIBANA_BEATS_MANIFEST_URL" ]; then
  echo "Kibana has the latest version of beats, skipping trigger"
else
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-staging "$BUILDKITE_BRANCH"
fi
