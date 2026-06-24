#!/usr/bin/env bash

set -euo pipefail

# Post eval comparison results as a GitHub PR comment.
#
# Two modes of operation:
#
# 1. Standard mode (PR builds):
#    Reads EVAL_SUITE_IDS, finds baseline on main via --baseline-branch,
#    generates a markdown comparison report, and upserts it as a PR comment.
#
# 2. Fresh baseline mode (triggered from PR block step):
#    When FRESH_BASELINE_PR_EXPERIMENT_ID is set, compares the original PR
#    experiment against the fresh main experiment (this build) using direct
#    two-ID comparison.

GITHUB_PR_NUMBER="${GITHUB_PR_NUMBER:-${BUILDKITE_PULL_REQUEST:-}}"
if [[ -z "$GITHUB_PR_NUMBER" ]] || [[ "$GITHUB_PR_NUMBER" == "false" ]]; then
  echo "Not a PR build; skipping eval comparison comment."
  exit 0
fi

FRESH_BASELINE_PR_EXPERIMENT_ID="${FRESH_BASELINE_PR_EXPERIMENT_ID:-}"

TEST_RUN_ID="${TEST_RUN_ID:-}"
if [[ -z "$TEST_RUN_ID" ]] && [[ -n "${BUILDKITE_BUILD_ID:-}" ]]; then
  TEST_RUN_ID="bk-${BUILDKITE_BUILD_ID}"
fi

if [[ -z "$TEST_RUN_ID" ]]; then
  echo "TEST_RUN_ID is not set and BUILDKITE_BUILD_ID is missing; skipping."
  exit 0
fi

KIBANA_URL="${EVALUATIONS_KBN_URL:-}"

EVAL_SUITE_IDS="${EVAL_SUITE_IDS:-}"
if [[ -z "$EVAL_SUITE_IDS" ]]; then
  echo "EVAL_SUITE_IDS is not set; skipping."
  exit 0
fi

MARKDOWN_FILE="$(mktemp -t kbn-evals-compare.XXXXXX.md)"
trap 'rm -f "$MARKDOWN_FILE"' EXIT

HAS_RESULTS="false"

IFS=',' read -ra SUITE_ARRAY <<<"$EVAL_SUITE_IDS"
for suite_id in "${SUITE_ARRAY[@]}"; do
  suite_id="$(printf '%s' "$suite_id" | xargs)"
  [[ -z "$suite_id" ]] && continue

  echo "--- Comparing eval results for suite: ${suite_id}"

  COMPARE_ARGS=(
    --suite "$suite_id"
    --format markdown
    --output "$MARKDOWN_FILE"
  )

  if [[ -n "$KIBANA_URL" ]]; then
    COMPARE_ARGS+=(--kibana-url "$KIBANA_URL")
  fi

  if [[ -n "$FRESH_BASELINE_PR_EXPERIMENT_ID" ]]; then
    # Fresh baseline mode: compare original PR experiment vs this build's fresh main experiment.
    # Args: <pr-experiment-id> <fresh-main-experiment-id>
    if node scripts/evals compare "$FRESH_BASELINE_PR_EXPERIMENT_ID" "$TEST_RUN_ID" \
      "${COMPARE_ARGS[@]}"; then
      HAS_RESULTS="true"
    else
      echo "Compare failed for suite ${suite_id}; continuing."
    fi
  else
    # Standard mode: compare this build's experiment against the latest baseline on main.
    COMPARE_ARGS+=(--baseline-branch main)

    # Pass refresh URL so the markdown includes a link to the block step.
    if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
      COMPARE_ARGS+=(--refresh-url "${BUILDKITE_BUILD_URL}#kbn-evals-refresh-block")
    fi

    if node scripts/evals compare "$TEST_RUN_ID" \
      "${COMPARE_ARGS[@]}"; then
      HAS_RESULTS="true"
    else
      echo "Compare failed for suite ${suite_id}; continuing."
    fi
  fi
done

if [[ "$HAS_RESULTS" != "true" ]] || [[ ! -s "$MARKDOWN_FILE" ]]; then
  echo "No comparison results generated; skipping PR comment."
  exit 0
fi

echo "--- Posting eval comparison comment to PR #${GITHUB_PR_NUMBER}"
export GITHUB_PR_NUMBER
cat "$MARKDOWN_FILE" | node -r @kbn/babel-register/install .buildkite/scripts/steps/evals/post_eval_pr_comment.ts
