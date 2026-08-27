#!/usr/bin/env bash

set -euo pipefail

# Post eval comparison results as a GitHub PR comment.
#
# Two modes of operation:
#
# 1. Standard mode (PR builds):
#    Reads the connector list from Buildkite metadata (written by run_suite.sh at
#    fanout time), then for each connector reads its full composite execution ID
#    (written by evaluate.ts after scoring) and calls `compare --baseline-branch main`.
#    Falls back to a per-suite metadata key or raw TEST_RUN_ID when the connector list
#    is unavailable (local dev, pre-fanout builds).
#
# 2. Fresh baseline mode (triggered from PR block step):
#    When FRESH_BASELINE_PR_EXPERIMENT_ID is set (a base build ID from the PR build),
#    reconstructs the PR composite from that base ID + suite + model extracted from
#    this build's composite, then calls `compare <pr-composite> <fresh-composite>`.

# Bootstrap is required so that workspace packages (e.g. @kbn/setup-node-env)
# are available when calling `node scripts/evals compare`.
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

GITHUB_PR_NUMBER="${GITHUB_PR_NUMBER:-${EVAL_PR_NUMBER:-${BUILDKITE_PULL_REQUEST:-}}}"
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

KIBANA_URL="${EVAL_KBN_URL:-}"

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

  _suite_key_safe="$(printf '%s' "$suite_id" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/^-|-$//g')"

  BASE_COMPARE_ARGS=(
    --suite "$suite_id"
    --format markdown
    --output "$MARKDOWN_FILE"
  )
  if [[ -n "$KIBANA_URL" ]]; then
    BASE_COMPARE_ARGS+=(--kibana-url "$KIBANA_URL")
  fi

  # Read the connector list written by run_suite.sh at fanout time.
  # Each entry is a connector ID (EVAL_PROJECT value, e.g. "eis-anthropic-claude-4-5-haiku").
  SUITE_CONNECTORS=""
  if command -v buildkite-agent >/dev/null 2>&1; then
    SUITE_CONNECTORS="$(buildkite-agent meta-data get "kbn-evals:connectors:${suite_id}" 2>/dev/null || true)"
  fi

  if [[ -n "$SUITE_CONNECTORS" ]]; then
    # Multi-model path: one compare call per connector.
    IFS=',' read -ra CONNECTOR_ARRAY <<<"$SUITE_CONNECTORS"
    for connector_id in "${CONNECTOR_ARRAY[@]}"; do
      connector_id="$(printf '%s' "$connector_id" | xargs)"
      [[ -z "$connector_id" ]] && continue

      # Read the full composite execution ID for this connector.
      # evaluate.ts writes "kbn-evals:execution-id:<suite>:<connector>" = "bk-BUILD_ID::suite::model"
      CONNECTOR_COMPOSITE=""
      if command -v buildkite-agent >/dev/null 2>&1; then
        CONNECTOR_COMPOSITE="$(buildkite-agent meta-data get "kbn-evals:execution-id:${suite_id}:${connector_id}" 2>/dev/null || true)"
      fi
      if [[ -z "$CONNECTOR_COMPOSITE" ]]; then
        echo "No execution ID for connector ${connector_id} in suite ${suite_id}; skipping."
        continue
      fi

      COMPARE_ARGS=("${BASE_COMPARE_ARGS[@]}")

      if [[ -n "$FRESH_BASELINE_PR_EXPERIMENT_ID" ]]; then
        # Fresh baseline mode: reconstruct the PR composite from the base build ID and the model
        # extracted from this build's composite. Both builds use the same connector/model, so
        # the model segment is identical (e.g. "bk-PR::smoke-tests::anthropic-claude-4-5-haiku").
        _model="${CONNECTOR_COMPOSITE##*::}"
        PR_COMPOSITE="${FRESH_BASELINE_PR_EXPERIMENT_ID}::${suite_id}::${_model}"
        if node scripts/evals compare "$PR_COMPOSITE" "$CONNECTOR_COMPOSITE" "${COMPARE_ARGS[@]}"; then
          HAS_RESULTS="true"
        else
          echo "Compare failed for suite ${suite_id} / connector ${connector_id}; continuing."
        fi
      else
        COMPARE_ARGS+=(--baseline-branch main)
        if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
          COMPARE_ARGS+=(--refresh-url "${BUILDKITE_BUILD_URL}#kbn-evals-${_suite_key_safe}-refresh-block")
        fi
        if node scripts/evals compare "$CONNECTOR_COMPOSITE" "${COMPARE_ARGS[@]}"; then
          HAS_RESULTS="true"
        else
          echo "Compare failed for suite ${suite_id} / connector ${connector_id}; continuing."
        fi
      fi
    done
  else
    # Single-model fallback: used when connector list metadata is unavailable
    # (local dev, builds predating this change, or non-fanout runs).
    SUITE_EXECUTION_ID="$TEST_RUN_ID"
    if command -v buildkite-agent >/dev/null 2>&1; then
      _meta_id="$(buildkite-agent meta-data get "kbn-evals:execution-id:${suite_id}" 2>/dev/null || true)"
      [[ -n "$_meta_id" ]] && SUITE_EXECUTION_ID="$_meta_id"
    fi

    COMPARE_ARGS=("${BASE_COMPARE_ARGS[@]}")

    if [[ -n "$FRESH_BASELINE_PR_EXPERIMENT_ID" ]]; then
      if node scripts/evals compare "$FRESH_BASELINE_PR_EXPERIMENT_ID" "$SUITE_EXECUTION_ID" \
        "${COMPARE_ARGS[@]}"; then
        HAS_RESULTS="true"
      else
        echo "Compare failed for suite ${suite_id}; continuing."
      fi
    else
      COMPARE_ARGS+=(--baseline-branch main)
      if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
        COMPARE_ARGS+=(--refresh-url "${BUILDKITE_BUILD_URL}#kbn-evals-${_suite_key_safe}-refresh-block")
      fi
      if node scripts/evals compare "$SUITE_EXECUTION_ID" "${COMPARE_ARGS[@]}"; then
        HAS_RESULTS="true"
      else
        echo "Compare failed for suite ${suite_id}; continuing."
      fi
    fi
  fi
done

if [[ "$HAS_RESULTS" != "true" ]] || [[ ! -s "$MARKDOWN_FILE" ]]; then
  echo "No comparison results generated; skipping PR comment."
  exit 0
fi

echo "--- Posting eval comparison comment to PR #${GITHUB_PR_NUMBER}"
export GITHUB_PR_NUMBER
# Always delete-and-recreate so the comment surfaces at the bottom of the PR
# thread after each build run, keeping it visible alongside newer activity.
export EVAL_COMMENT_CLEAR_PREVIOUS=1
ts-node .buildkite/scripts/steps/evals/post_eval_pr_comment.ts < "$MARKDOWN_FILE"
