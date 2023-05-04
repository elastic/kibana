#!/bin/bash

set -euo pipefail

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  echo "--- Trigger artifacts container image pipeline"
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-container-image "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
fi
