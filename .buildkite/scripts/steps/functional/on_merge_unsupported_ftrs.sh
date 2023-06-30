#!/bin/bash

set -euo pipefail

echo "--- Trigger unsupported ftr tests"
ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-on-merge-unsupported-ftrs "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT" "$BUILDKITE_BUILD_ID"
