#!/bin/bash

set -euo pipefail

ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-pull-request "$BUILDKITE_BRANCH"
