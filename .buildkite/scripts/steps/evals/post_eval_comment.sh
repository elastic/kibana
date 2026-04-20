#!/usr/bin/env bash

set -euo pipefail

# Post an eval comparison comment on the PR.
# Runs after all eval suite steps; compares each suite's PR run against the
# latest main-branch baseline and upserts a summary table as a GitHub PR comment.

source .buildkite/scripts/steps/functional/common.sh

GITHUB_PR_NUMBER="${GITHUB_PR_NUMBER:-}"
if [[ -z "$GITHUB_PR_NUMBER" ]]; then
  echo "Not a PR build (GITHUB_PR_NUMBER is empty). Skipping eval comparison comment."
  exit 0
fi

EVAL_SUITE_IDS="${EVAL_SUITE_IDS:-}"
if [[ -z "$EVAL_SUITE_IDS" ]]; then
  echo "EVAL_SUITE_IDS is empty. Nothing to compare."
  exit 0
fi

RUN_ID="${TEST_RUN_ID:-}"
if [[ -z "$RUN_ID" ]] && [[ -n "${BUILDKITE_BUILD_ID:-}" ]]; then
  RUN_ID="bk-${BUILDKITE_BUILD_ID}"
fi

if [[ -z "$RUN_ID" ]]; then
  echo "Cannot determine run ID (TEST_RUN_ID and BUILDKITE_BUILD_ID are both empty)."
  exit 1
fi

BASELINE_BRANCH="${EVAL_BASELINE_BRANCH:-main}"
KIBANA_URL="${EVALUATIONS_KBN_URL:-}"

MARKDOWN=""

IFS=',' read -ra SUITES <<< "$EVAL_SUITE_IDS"
for suite_id in "${SUITES[@]}"; do
  suite_id="$(printf '%s' "$suite_id" | xargs)"
  [[ -z "$suite_id" ]] && continue

  echo "--- Comparing suite: $suite_id"

  SUITE_MD_FILE="$(mktemp)"

  COMPARE_ARGS=(
    compare "$RUN_ID"
    --baseline-branch "$BASELINE_BRANCH"
    --suite "$suite_id"
    --format markdown
    --output "$SUITE_MD_FILE"
  )

  if [[ -n "$KIBANA_URL" ]]; then
    COMPARE_ARGS+=(--kibana-url "$KIBANA_URL")
  fi

  node scripts/evals "${COMPARE_ARGS[@]}" || true

  if [[ -s "$SUITE_MD_FILE" ]]; then
    MARKDOWN+="$(cat "$SUITE_MD_FILE")"$'\n'
  else
    echo "No comparison output for suite $suite_id (no baseline or no results)."
  fi
  rm -f "$SUITE_MD_FILE"
done

if [[ -z "$MARKDOWN" ]]; then
  echo "No comparison results to post."
  exit 0
fi

echo "--- Posting eval comparison comment on PR #$GITHUB_PR_NUMBER"

printf '%s' "$MARKDOWN" | ts-node .buildkite/scripts/steps/evals/post_eval_pr_comment.ts
