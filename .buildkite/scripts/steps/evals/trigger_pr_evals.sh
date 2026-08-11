#!/usr/bin/env bash

set -euo pipefail

# MUST match GITHUB_BUILD_COMMIT_STATUS_CONTEXT in
# .buildkite/pipeline-resource-definitions/evals/kibana-evals-pr.yml (kept in sync by hand).
EVALS_COMMIT_STATUS_CONTEXT="kibana-evals"

# kibana-evals-pr-llm-evals posts the kibana-evals status itself once it starts; the step is
# soft_fail, so without this a failed trigger leaves the PR green with no kibana-evals context at all.
post_evals_status() { # $1=state $2=description
  gh api "repos/elastic/kibana/statuses/${BUILDKITE_COMMIT:-}" \
    -f "state=$1" \
    -f target_url="${BUILDKITE_BUILD_URL:-}" \
    -f "context=${EVALS_COMMIT_STATUS_CONTEXT}" \
    -f "description=$2" \
    --silent || true
}

# ERR traps don't run on SIGTERM (the 10-min timeout), agent loss, or `set -u` aborts, so post
# pending up front: any death then leaves a visible kibana-evals. The child overwrites it on success.
post_evals_status pending "Triggering the LLM Evals pipeline"

# Only mark failure on the final attempt (retry limit is 1); an earlier transient failure is
# retried and the pending status above holds until then. Best-effort; never mask the original error.
on_trigger_error() {
  if [[ "${BUILDKITE_RETRY_COUNT:-0}" -ge 1 ]]; then
    post_evals_status failure "Failed to trigger the LLM Evals pipeline"
  fi
}
trap on_trigger_error ERR

echo "--- Triggering LLM Evals pipeline (kibana-evals-pr-llm-evals)"

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
  GITHUB_PR_BASE_OWNER \
  GITHUB_PR_BASE_REPO \
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
  kibana-evals-pr-llm-evals \
  "$BUILDKITE_BRANCH" \
  "$BUILDKITE_COMMIT" \
  "$KIBANA_BUILD_ID_ARG" \
  "${GITHUB_ENV_VARS[*]:-}" \
  "true"
