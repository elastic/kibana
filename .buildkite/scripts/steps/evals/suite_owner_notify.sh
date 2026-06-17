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

# Notification mode controls the Slack header (on-demand vs scheduled weekly run).
if [[ "${KBN_EVALS_ON_DEMAND:-}" =~ ^(1|true)$ ]]; then
  EVAL_NOTIFY_MODE="on-demand"
else
  EVAL_NOTIFY_MODE="weekly"
fi
export EVAL_NOTIFY_MODE

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

cd "${KIBANA_DIR:-${BUILDKITE_BUILD_CHECKOUT_PATH:-$(pwd)}}"

if [[ ! -d node_modules/@elastic/elasticsearch ]] || ! node -e "require('@elastic/elasticsearch')" 2>/dev/null; then
  echo "--- Bootstrap (required for suite owner Slack message)"
  .buildkite/scripts/bootstrap.sh
fi

echo "--- Preparing model connector for triage summary"
if [[ -n "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  source .buildkite/scripts/steps/evals/setup_triage_connectors.sh || {
    echo "WARNING: setup_triage_connectors failed; build_suite_owner_slack_message will use vault LiteLLM fallback"
  }
else
  echo "WARNING: KBN_EVALS_CONFIG_B64 is not set; build_suite_owner_slack_message requires vault LiteLLM env vars"
fi

SUMMARY_FILE="$(mktemp -t kbn-evals-suite-summary.XXXXXX.md)"
FAILING_PROJECTS_CSV="$(IFS=,; echo "${failing_projects[*]}")"

echo "--- Building suite owner Slack message (static + model triage)"
if ! node x-pack/platform/packages/shared/kbn-evals/scripts/ci/build_suite_owner_slack_message.js \
  "$EVAL_SUITE_ID" "$SUMMARY_FILE" "$FAILING_PROJECTS_CSV" "$EVAL_NOTIFY_MODE"; then
  echo "--- build_suite_owner_slack_message crashed; writing static summary with triage error note"
  if [[ "${EVAL_NOTIFY_MODE}" == "on-demand" ]]; then
    fallback_header=":test_tube: *On-demand LLM eval* — %s (\`%s\`) failed."
  else
    fallback_header=":rotating_light: *Weekly LLM evals* — %s (\`%s\`) failed."
  fi
  {
    # shellcheck disable=SC2059
    printf "${fallback_header}\n\n" "$suite_name" "$EVAL_SUITE_ID"
    printf '*Failing models:*\n'
    for project in "${failing_projects[@]}"; do
      printf -- '- `%s`\n' "${project}"
    done
    if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
      printf '\n<%s|View build>\n' "${BUILDKITE_BUILD_URL}"
    fi
    printf '\n*Triage summary (model unavailable):*\n'
    printf '_Suite owner message builder failed. See the suite owner notify Buildkite step for details._\n'
  } >"$SUMMARY_FILE"
fi

echo "--- Suite failure summary"
cat "$SUMMARY_FILE"

if ! grep -q 'Triage summary' "$SUMMARY_FILE"; then
  echo "WARNING: Slack message is missing a triage section header"
fi

buildkite-agent meta-data set "kbn-evals:triage:${suite_key_safe}" "$(cat "$SUMMARY_FILE")" >/dev/null 2>&1 || true
buildkite-agent annotate --context "kbn-evals-summary-${suite_key_safe}" --style 'error' "$(cat "$SUMMARY_FILE")" || true

# Record a per-suite job link so the weekly roll-up can deep-link to this suite's
# triage job (instead of one link per failing model).
if [[ -n "${BUILDKITE_BUILD_URL:-}" && -n "${BUILDKITE_JOB_ID:-}" ]]; then
  buildkite-agent meta-data set "kbn-evals:suite-job-url:${suite_key_safe}" \
    "${BUILDKITE_BUILD_URL}#${BUILDKITE_JOB_ID}" >/dev/null 2>&1 || true
fi

if [[ -n "${EVAL_SUITE_SLACK_CHANNEL:-}" ]]; then
  if ! node -e "require('yaml')" 2>/dev/null; then
    echo "--- Bootstrap (required for generate_suite_notify_pipeline.js)"
    .buildkite/scripts/bootstrap.sh
  fi

  NOTIFY_PIPELINE_FILE="$(mktemp -t kbn-evals-notify-pipeline.XXXXXX.yml)"
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_suite_notify_pipeline.js \
    "$SUMMARY_FILE" "$EVAL_SUITE_SLACK_CHANNEL" >"$NOTIFY_PIPELINE_FILE"

  echo "--- Uploading suite owner Slack notify pipeline (channel: ${EVAL_SUITE_SLACK_CHANNEL})"
  cat "$NOTIFY_PIPELINE_FILE"
  if ! buildkite-agent pipeline upload "$NOTIFY_PIPELINE_FILE"; then
    rm -f "$NOTIFY_PIPELINE_FILE" "$SUMMARY_FILE"
    exit 1
  fi
  rm -f "$NOTIFY_PIPELINE_FILE"
fi

rm -f "$SUMMARY_FILE"
exit 0
