#!/bin/bash

set -euo pipefail

echo "--- Promote snapshot"
export ES_SNAPSHOT_MANIFEST="${ES_SNAPSHOT_MANIFEST:-"$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST)"}"

cat << EOF | buildkite-agent annotate --style "info"
  This promotion is for the following snapshot manifest:

  $ES_SNAPSHOT_MANIFEST
EOF

ts-node "$(dirname "${0}")/promote_manifest.ts" "$ES_SNAPSHOT_MANIFEST"

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  echo "--- Trigger agent packer cache pipeline"
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-agent-packer-cache main
fi
