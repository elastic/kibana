#!/bin/bash

set -euo pipefail

ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-artifacts-container-image "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
