#!/usr/bin/env bash

set -euo pipefail

# Commit-status context posted from the failure path below. MUST match
# GITHUB_BUILD_COMMIT_STATUS_CONTEXT in
# .buildkite/pipeline-resource-definitions/evals/kibana-evals-pr.yml (kept in sync by hand).
EVALS_COMMIT_STATUS_CONTEXT="kibana-evals"

# kibana-evals-pr posts the kibana-evals status itself once it starts. If the trigger never
# succeeds that status never appears, and the step is soft_fail so the PR still goes green —
# post an explicit failure so the gap is visible. Best-effort; never mask the original error.
post_trigger_failure_status() {
  gh api "repos/elastic/kibana/statuses/${BUILDKITE_COMMIT:-}" \
    -f state=failure \
    -f target_url="${BUILDKITE_BUILD_URL:-}" \
    -f context="${EVALS_COMMIT_STATUS_CONTEXT}" \
    -f description="Failed to trigger the LLM Evals pipeline" \
    --silent || true
}
trap post_trigger_failure_status ERR

echo "--- Triggering LLM Evals pipeline (kibana-evals-pr)"

# GITHUB_PR_LABELS is pre-filtered to whitespace-free labels by getEvalTriggerStep
# (getForwardablePrLabels in eval_pipeline.ts), so it forwards safely alongside the scalar
# PR-context vars. trigger_pipeline.ts splits its extra-env arg on spaces, so every forwarded
# value must be whitespace-free — we defensively skip any that isn't.
GITHUB_ENV_VARS=()
for var in \
  GITHUB_PR_NUMBER \
  GITHUB_PR_OWNER \
  GITHUB_PR_REPO \
  GITHUB_PR_BRANCH \
  GITHUB_PR_TARGET_BRANCH \
  GITHUB_PR_TRIGGERED_SHA \
  GITHUB_PR_DRAFT \
  GITHUB_PR_MAINTAINER_APPROVED \
  GITHUB_PR_LABELS; do
  value="${!var:-}"
  if [[ -n "$value" && ! "$value" =~ [[:space:]] ]]; then
    GITHUB_ENV_VARS+=("$var=$value")
  fi
done

# Reuse the PR build's Kibana distributable instead of rebuilding it.
KIBANA_BUILD_ID_ARG="${KIBANA_BUILD_ID:-${BUILDKITE_BUILD_ID:-}}"

# includeBuildkitePrVars=true forwards BUILDKITE_PULL_REQUEST* so the child build checks out
# refs/pull/<N>/head — required for fork PRs, whose branch isn't a ref in elastic/kibana.
# ${GITHUB_ENV_VARS[*]:-} guards against an empty array under `set -u`.
ts-node .buildkite/scripts/steps/trigger_pipeline.ts \
  kibana-evals-pr \
  "$BUILDKITE_BRANCH" \
  "$BUILDKITE_COMMIT" \
  "$KIBANA_BUILD_ID_ARG" \
  "${GITHUB_ENV_VARS[*]:-}" \
  "true"
