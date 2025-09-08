#!/bin/bash

set -euo pipefail

echo --- Triggering Kibana Pull Request Pipeline

# The Github env vars need to be passed along manually
# GITHUB_PR_* is used to avoid any sensitive vars being passed along
GITHUB_ENV_VARS=()
for var in $(env | grep ^GITHUB_PR_ | cut -d= -f1); do
  GITHUB_ENV_VARS+=("$var=${!var}")
done

ts-node .buildkite/scripts/steps/trigger_pipeline.ts kibana-pull-request "$BUILDKITE_BRANCH" "$BUILDKITE_COMMIT" "" "${GITHUB_ENV_VARS[*]}"
