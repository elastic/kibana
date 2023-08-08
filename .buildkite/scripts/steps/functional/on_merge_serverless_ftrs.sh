#!/bin/bash

set -euo pipefail

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  echo "--- Trigger serverless ftr tests"
  ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-serverless "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT" "$BUILDKITE_BUILD_ID"
fi
