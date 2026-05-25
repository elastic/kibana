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
while IFS= read -r key; do
  [[ -z "${key}" ]] && continue
    value="$(buildkite-agent meta-data get "${key}" --default '' 2>/dev/null || true)"
  [[ -z "${value}" ]] && continue
  printf '%s\n' "${value}"
done <<<"${failure_keys}" | sort -u | sed 's/^/- /'
echo ""
echo "Build: ${BUILDKITE_BUILD_URL:-}"

EVAL_SUITE_INFO="$(
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/get_suite_info.js "$EVAL_SUITE_ID" || true
)"
EVAL_SUITE_SLACK_CHANNEL="$(printf '%s' "${EVAL_SUITE_INFO}" | jq -r '.slackChannel // empty' 2>/dev/null || true)"

SUMMARY_FILE="$(mktemp -t kbn-evals-suite-summary.XXXXXX.md)"
NOTIFY_PIPELINE_FILE="$(mktemp -t kbn-evals-notify-pipeline.XXXXXX.yml)"

node x-pack/platform/packages/shared/kbn-evals/scripts/ci/format_suite_failure_summary.js \
  "$EVAL_SUITE_ID" "$SUMMARY_FILE"

echo "--- Suite failure summary"
cat "$SUMMARY_FILE"

buildkite-agent meta-data set "kbn-evals:triage:${suite_key_safe}" "$(cat "$SUMMARY_FILE")" >/dev/null 2>&1 || true
buildkite-agent annotate --context "kbn-evals-summary-${suite_key_safe}" --style 'error' "$(cat "$SUMMARY_FILE")" || true

if [[ -n "${EVAL_SUITE_SLACK_CHANNEL:-}" ]]; then
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_suite_notify_pipeline.js \
    "$SUMMARY_FILE" "$EVAL_SUITE_SLACK_CHANNEL" >"$NOTIFY_PIPELINE_FILE"
  buildkite-agent pipeline upload "$NOTIFY_PIPELINE_FILE"
fi

rm -f "$SUMMARY_FILE" "$NOTIFY_PIPELINE_FILE"
exit 1
