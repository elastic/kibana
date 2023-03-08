#!/bin/bash

set -euo pipefail

echo "--- Trigger unsupported ftr tests"
ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-e2e-tests "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
