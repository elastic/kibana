#!/bin/bash

set -euo pipefail

echo --- Triggering Kibana Pull Request Pipeline

ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-pull-request "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT"
