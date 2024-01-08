#!/bin/bash

set -euo pipefail

source .buildkite/scripts/steps/artifacts/env.sh

BEATS_MANIFEST_LATEST_URL=$(curl  "$BEATS_MANIFEST_LATEST" | jq -r '.manifest_url')
KIBANA_MANIFEST_URL=$(curl  "$KIBANA_MANIFEST_LATEST" | jq -r '.manifest_url')
KIBANA_BEATS_MANIFEST_URL=$(curl $KIBANA_MANIFEST_URL | jq -r '.projects.kibana.dependencies[] | select(.prefix == "beats") | .build_uri')

echo "--- Trigger artifact builds"
if [ "$BEATS_MANIFEST_LATEST_URL" = "$KIBANA_BEATS_MANIFEST_URL" ]; then
  echo "Kibana has the latest version of beats, skipping trigger"
else
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-staging "$BUILDKITE_BRANCH"
fi
