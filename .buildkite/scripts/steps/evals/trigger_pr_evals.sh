#!/usr/bin/env bash

set -euo pipefail

echo "--- Triggering LLM Evals pipeline (kibana-evals-pr)"

# trigger_pipeline.ts splits its extra-env arg on spaces, so every forwarded value must be
# whitespace-free. Forward an explicit allowlist of scalar GITHUB_PR_* vars only.
GITHUB_ENV_VARS=()
for var in \
  GITHUB_PR_NUMBER \
  GITHUB_PR_OWNER \
  GITHUB_PR_REPO \
  GITHUB_PR_BRANCH \
  GITHUB_PR_TARGET_BRANCH \
  GITHUB_PR_TRIGGERED_SHA \
  GITHUB_PR_DRAFT \
  GITHUB_PR_MAINTAINER_APPROVED; do
  value="${!var:-}"
  # Skip unset/empty, and defensively skip anything with whitespace (these never have it).
  if [[ -n "$value" && ! "$value" =~ [[:space:]] ]]; then
    GITHUB_ENV_VARS+=("$var=$value")
  fi
done

# Labels drive the child's suite/model selection (and build_kibana.sh's rspack cache check).
# Drop whitespace-containing labels: one spaced label (e.g. "good first issue") would truncate
# the CSV and silently drop the evals:*/models:* labels — zero suites run, yet a green status.
if [[ -n "${GITHUB_PR_LABELS:-}" ]]; then
  forward_labels=""
  IFS=',' read -ra _labels <<<"$GITHUB_PR_LABELS"
  for _label in "${_labels[@]}"; do
    [[ -z "$_label" || "$_label" =~ [[:space:]] ]] && continue
    forward_labels="${forward_labels:+$forward_labels,}$_label"
  done
  GITHUB_ENV_VARS+=("GITHUB_PR_LABELS=$forward_labels")
fi

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
