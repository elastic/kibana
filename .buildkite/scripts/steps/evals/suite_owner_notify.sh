#!/usr/bin/env bash

set -euo pipefail

EVAL_SUITE_ID="${EVAL_SUITE_ID:-}"
if [[ -z "${EVAL_SUITE_ID}" ]]; then
  echo "EVAL_SUITE_ID is required"
  exit 1
fi

if ! command -v buildkite-agent >/dev/null 2>&1; then
  echo "buildkite-agent is required"
  exit 1
fi

suite_key_safe="$(printf '%s' "$EVAL_SUITE_ID" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/^-|-$//g')"
failures_prefix="kbn-evals:suite-failures:${suite_key_safe}:"

all_keys="$(buildkite-agent meta-data keys 2>/dev/null || true)"
failure_keys="$(printf '%s\n' "${all_keys}" | grep -E "^${failures_prefix}" || true)"
if [[ -z "${failure_keys}" ]]; then
  echo "No failures recorded for suite ${EVAL_SUITE_ID}"
  exit 0
fi

suite_name="${EVAL_SUITE_NAME:-$EVAL_SUITE_ID}"

echo "Suite failed: ${suite_name} (${EVAL_SUITE_ID})"
echo ""
echo "Failing connector projects:"
mapfile -t failing_projects < <(
  while IFS= read -r key; do
    [[ -z "${key}" ]] && continue
    value="$(buildkite-agent meta-data get "${key}" --default '' 2>/dev/null || true)"
    [[ -z "${value}" ]] && continue
    printf '%s\n' "${value}"
  done <<<"${failure_keys}" | sort -u
)
for project in "${failing_projects[@]}"; do
  printf -- '- %s\n' "${project}"
done
echo ""
echo "Build: ${BUILDKITE_BUILD_URL:-}"

EVAL_SUITE_SLACK_CHANNEL="${EVAL_SUITE_SLACK_CHANNEL:-}"
if [[ -z "${EVAL_SUITE_SLACK_CHANNEL}" ]]; then
  suites_json="${KIBANA_DIR:-${BUILDKITE_BUILD_CHECKOUT_PATH:-$(pwd)}}/.buildkite/pipelines/evals/evals.suites.json"
  EVAL_SUITE_SLACK_CHANNEL="$(
    jq -r --arg id "$EVAL_SUITE_ID" '.suites[] | select(.id == $id) | .slackChannel // empty' "$suites_json" 2>/dev/null || true
  )"
fi

SUMMARY_FILE="$(mktemp -t kbn-evals-suite-summary.XXXXXX.md)"

{
  printf ':rotating_light: *%s* (`%s`) failed in LLM evals.\n\n' "$suite_name" "$EVAL_SUITE_ID"
  printf '*Failing models:*\n'
  for project in "${failing_projects[@]}"; do
    printf -- '- `%s`\n' "${project}"
  done
  if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
    printf '\n<%s|View build>\n' "${BUILDKITE_BUILD_URL}"
  fi
} >"$SUMMARY_FILE"

echo "--- Suite failure summary"
cat "$SUMMARY_FILE"

buildkite-agent meta-data set "kbn-evals:triage:${suite_key_safe}" "$(cat "$SUMMARY_FILE")" >/dev/null 2>&1 || true
buildkite-agent annotate --context "kbn-evals-summary-${suite_key_safe}" --style 'error' "$(cat "$SUMMARY_FILE")" || true

if [[ -n "${EVAL_SUITE_SLACK_CHANNEL:-}" ]]; then
  cd "${KIBANA_DIR:-${BUILDKITE_BUILD_CHECKOUT_PATH:-$(pwd)}}"

  if ! node -e "require('yaml')" 2>/dev/null; then
    echo "--- Bootstrap (required for generate_suite_notify_pipeline.js)"
    .buildkite/scripts/bootstrap.sh
  fi

  NOTIFY_PIPELINE_FILE="$(mktemp -t kbn-evals-notify-pipeline.XXXXXX.yml)"
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_suite_notify_pipeline.js \
    "$SUMMARY_FILE" "$EVAL_SUITE_SLACK_CHANNEL" >"$NOTIFY_PIPELINE_FILE"

  echo "--- Uploading suite owner Slack notify pipeline (channel: ${EVAL_SUITE_SLACK_CHANNEL})"
  cat "$NOTIFY_PIPELINE_FILE"
  buildkite-agent pipeline upload "$NOTIFY_PIPELINE_FILE"
  rm -f "$NOTIFY_PIPELINE_FILE"
fi

rm -f "$SUMMARY_FILE"
exit 1
