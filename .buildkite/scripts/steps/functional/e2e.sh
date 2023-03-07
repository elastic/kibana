#!/bin/bash

set -euo pipefail

echo "--- Trigger kibana e2e pipeline"
ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana_e2e "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
