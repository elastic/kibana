#!/bin/bash

set -euo pipefail

# Usage: trigger_from_pr.sh <pipeline-slug>
#
# Starts a build of a *-from-pr pipeline for the current PR, e.g. to run work that needs
# credentials only that pipeline is granted. Unlike a native `trigger` step, this sets the
# build's pull request fields (so fork PRs check out refs/pull/<N>/head) and forwards the
# GITHUB_PR_* context (labels, PR number) the child pipeline uses to decide what to run.
PIPELINE_SLUG="$1"

echo "--- Trigger $PIPELINE_SLUG"

# The Github env vars need to be passed along manually
# GITHUB_PR_* is used to avoid any sensitive vars being passed along
# trigger_pipeline.ts splits its env arg on spaces and `=`, so labels containing either are
# dropped (a spaced label would truncate the list) and other values with whitespace are skipped
GITHUB_ENV_VARS=()
for var in $(env | grep ^GITHUB_PR_ | cut -d= -f1); do
  value="${!var}"
  if [[ "$var" == "GITHUB_PR_LABELS" ]]; then
    value="$(tr ',' '\n' <<< "$value" | { grep -v '[[:space:]=]' || true; } | paste -sd, -)"
  fi
  if [[ -n "$value" && ! "$value" =~ [[:space:]] ]]; then
    GITHUB_ENV_VARS+=("$var=$value")
  fi
done

# Pass KIBANA_BUILD_ID if available to reuse builds
KIBANA_BUILD_ID_ARG="${KIBANA_BUILD_ID:-}"

# [*] because trigger_pipeline.ts expects a single space-separated string argument
node .buildkite/scripts/steps/trigger_pipeline.ts \
  "$PIPELINE_SLUG" \
  "$BUILDKITE_BRANCH" \
  "$BUILDKITE_COMMIT" \
  "$KIBANA_BUILD_ID_ARG" \
  "${GITHUB_ENV_VARS[*]:-}" \
  "true"
