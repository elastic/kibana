#!/bin/bash

set -euo pipefail

echo "--- Trigger Entity Store Performance Tests Pipeline"

# The Github env vars need to be passed along manually
# GITHUB_PR_* is used to avoid any sensitive vars being passed along
GITHUB_ENV_VARS=()
for var in $(env | grep ^GITHUB_PR_ | cut -d= -f1); do
  GITHUB_ENV_VARS+=("$var=${!var}")
done

# Pass KIBANA_BUILD_ID if available to reuse builds
KIBANA_BUILD_ID_ARG="${KIBANA_BUILD_ID:-}"

ts-node .buildkite/scripts/steps/trigger_pipeline.ts \
  kibana-entity-store-performance-from-pr \
  "$BUILDKITE_BRANCH" \
  "$BUILDKITE_COMMIT" \
  "$KIBANA_BUILD_ID_ARG" \
  "${GITHUB_ENV_VARS[*]}" \
  "true"

