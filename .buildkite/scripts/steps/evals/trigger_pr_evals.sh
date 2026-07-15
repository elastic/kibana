#!/usr/bin/env bash

set -euo pipefail

echo "--- Triggering LLM Evals pipeline (kibana-evals-pr)"

# Forward the GitHub PR context so kibana-evals-pr re-selects the same suites/models
# (GITHUB_PR_LABELS) and can post triage back to the PR (GITHUB_PR_NUMBER). GITHUB_PR_*
# only, to avoid leaking other/sensitive vars. Values must not contain spaces (see
# trigger_pipeline.ts); the eval-relevant labels never do.
GITHUB_ENV_VARS=()
for var in $(env | grep ^GITHUB_PR_ | cut -d= -f1); do
  GITHUB_ENV_VARS+=("$var=${!var}")
done

# Reuse the PR build's Kibana distributable instead of rebuilding it.
KIBANA_BUILD_ID_ARG="${KIBANA_BUILD_ID:-${BUILDKITE_BUILD_ID:-}}"

# includeBuildkitePrVars=true forwards BUILDKITE_PULL_REQUEST* so the child build checks
# out refs/pull/<N>/head — required for fork PRs, whose branch isn't a ref in elastic/kibana.
ts-node .buildkite/scripts/steps/trigger_pipeline.ts \
  kibana-evals-pr \
  "$BUILDKITE_BRANCH" \
  "$BUILDKITE_COMMIT" \
  "$KIBANA_BUILD_ID_ARG" \
  "${GITHUB_ENV_VARS[*]}" \
  "true"
