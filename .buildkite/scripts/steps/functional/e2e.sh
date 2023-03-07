#!/bin/bash

set -euo pipefail

echo "--- Trigger kibana e2e pipeline"
ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-e2e-tests "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
