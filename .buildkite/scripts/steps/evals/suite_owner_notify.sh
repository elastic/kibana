#!/usr/bin/env bash

set -euo pipefail

SLACK_FILE=""
GITHUB_FILE=""
NOTIFY_PIPELINE_FILE=""
cleanup() {
  rm -f "${SLACK_FILE}" "${GITHUB_FILE}" "${NOTIFY_PIPELINE_FILE}" 2>/dev/null || true
}
trap cleanup EXIT

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

suite_name="${EVAL_SUITE_NAME:-$EVAL_SUITE_ID}"

if [[ "${KBN_EVALS_WEEKLY:-}" =~ ^(1|true)$ ]]; then
  EVAL_NOTIFY_MODE="weekly"
  header_label="Weekly LLM evals"
elif [[ "${KBN_EVALS_DAILY:-}" =~ ^(1|true)$ ]]; then
  EVAL_NOTIFY_MODE="daily"
  header_label="Daily LLM evals"
else
  EVAL_NOTIFY_MODE="on-demand"
  header_label="On-demand LLM eval"
fi

# --- Resolve destinations -------------------------------------------------
# Slack: weekly -> the suite's team channel; otherwise -> EVAL_SLACK_NOTIFICATION_CHANNEL
# (so daily/on-demand/PR runs never auto-post to a team channel).
slack_channel=""
if [[ "${EVAL_NOTIFY_MODE}" == "weekly" ]]; then
  slack_channel="${EVAL_SUITE_SLACK_CHANNEL:-}"
else
  slack_channel="${EVAL_SLACK_NOTIFICATION_CHANNEL:-}"
fi

# A weekly or daily build on another branch (e.g. refs/pull/<N>/head) keeps its PR comment but
# must not post that branch's result to the scheduled run's channel.
notify_branch="${BUILDKITE_PIPELINE_DEFAULT_BRANCH:-main}"
if [[ "${EVAL_NOTIFY_MODE}" != "on-demand" && "${BUILDKITE_BRANCH:-}" != "${notify_branch}" ]]; then
  slack_channel=""
fi

# PR: comment when a PR number was resolved (run_suite.sh derives it from
# GITHUB_PR_NUMBER, BUILDKITE_PULL_REQUEST, or refs/pull/<N>/head).
pr_number="${EVAL_PR_NUMBER:-}"

# upload_slack_notify <message_file> <hard_failed|passed>
# Uploads a step whose own Slack notify posts the message to slack_channel. `hard_failed` uses a
# failing step (for a failed suite); `passed` uses a passing, soft-failing step, so the post can
# never turn a green build red.
upload_slack_notify() {
  local message_file="$1" step_outcome="$2"

  NOTIFY_PIPELINE_FILE="$(mktemp -t kbn-evals-notify-pipeline.XXXXXX.yml)"
  EVAL_TRIAGE_SUMMARY_PATH="$message_file" \
    EVAL_SUITE_SLACK_CHANNEL="$slack_channel" \
    EVAL_NOTIFY_STEP_OUTCOME="$step_outcome" \
    node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_suite_notify_pipeline.js \
    >"$NOTIFY_PIPELINE_FILE"

  echo "--- Uploading suite owner Slack notify pipeline (channel: ${slack_channel})"
  cat "$NOTIFY_PIPELINE_FILE"
  buildkite-agent pipeline upload "$NOTIFY_PIPELINE_FILE" || echo "WARNING: failed to upload Slack notify pipeline"
}

all_keys="$(buildkite-agent meta-data keys 2>/dev/null || true)"
failure_keys="$(printf '%s\n' "${all_keys}" | grep -E "^${failures_prefix}" || true)"
if [[ -z "${failure_keys}" ]]; then
  echo "No failures recorded for suite ${EVAL_SUITE_ID}"

  # Weekly and daily runs also report a clean run, so the channel shows the run happened.
  # On-demand runs stay failure-only.
  if [[ "${EVAL_NOTIFY_MODE}" == "on-demand" ]]; then
    exit 0
  fi

  # A step that timed out or was cancelled can end before its exit trap records a failure, so
  # check every eval step's outcome before calling the run passed. This runs before the channel
  # check, so a build off the default branch exercises it without posting.
  IFS=, read -r -a eval_step_keys <<<"${EVAL_FANOUT_STEP_KEYS:-}"
  if [[ ${#eval_step_keys[@]} -eq 0 ]]; then
    echo "EVAL_FANOUT_STEP_KEYS is unset; cannot confirm the eval steps passed, so not posting"
    exit 0
  fi
  # The first reason the run cannot be called passed, as a sentence for the Slack message. A failed
  # lookup counts too, so a broken `step get` surfaces in the channel instead of going quiet.
  unconfirmed_reason=""
  for step_key in "${eval_step_keys[@]}"; do
    if ! outcome="$(buildkite-agent step get outcome --step "${step_key}")"; then
      echo "Could not read the outcome of eval step ${step_key}"
      if [[ -z "${unconfirmed_reason}" ]]; then
        unconfirmed_reason="The outcome of eval step \`${step_key}\` could not be read"
      fi
      continue
    fi
    echo "Eval step ${step_key}: ${outcome}"
    if [[ "${outcome}" != "passed" && -z "${unconfirmed_reason}" ]]; then
      unconfirmed_reason="Eval step \`${step_key}\` ended \`${outcome:-unknown}\` without recording a failure"
    fi
  done

  if [[ -z "${slack_channel}" ]]; then
    echo "No Slack channel for this build (only ${notify_branch} posts), so not posting"
    exit 0
  fi

  cd "${KIBANA_DIR:-${BUILDKITE_BUILD_CHECKOUT_PATH:-$(pwd)}}"

  if ! node -e "require('yaml')" 2>/dev/null; then
    echo "--- Bootstrap (required for the Slack notify pipeline)"
    .buildkite/scripts/bootstrap.sh
  fi

  SLACK_FILE="$(mktemp -t kbn-evals-pass-slack.XXXXXX.md)"

  if [[ -n "${unconfirmed_reason}" ]]; then
    # Worded as unconfirmed rather than failed: the step may have been retried, and the
    # recorded outcome is the only signal here.
    printf ':warning: *%s* — %s (`%s`): could not confirm the run passed. %s; see the build.\n' \
      "$header_label" "$suite_name" "$EVAL_SUITE_ID" "$unconfirmed_reason" >"$SLACK_FILE"
    upload_slack_notify "$SLACK_FILE" passed
    exit 0
  fi

  models="$(buildkite-agent meta-data get "kbn-evals:connectors:${EVAL_SUITE_ID}" --default '' 2>/dev/null || true)"
  {
    printf ':white_check_mark: *%s* — %s (`%s`) passed. Every eval step finished; scores are not checked against a threshold.\n' "$header_label" "$suite_name" "$EVAL_SUITE_ID"
    if [[ -n "${models}" ]]; then
      printf '\n*Models:*\n'
      while IFS= read -r model; do
        [[ -n "${model}" ]] && printf -- '- `%s`\n' "${model}"
      done <<<"${models//,/$'\n'}"
    fi
  } >"$SLACK_FILE"
  upload_slack_notify "$SLACK_FILE" passed
  exit 0
fi

if [[ -z "${slack_channel}" && -z "${pr_number}" ]]; then
  echo "No Slack channel and not a PR build; skipping triage for suite ${EVAL_SUITE_ID}"
  exit 0
fi

echo "Suite failed: ${suite_name} (${EVAL_SUITE_ID})"
echo "Destinations: slack='${slack_channel:-<none>}' pr='${pr_number:-<none>}'"
mapfile -t failing_projects < <(
  while IFS= read -r key; do
    [[ -z "${key}" ]] && continue
    value="$(buildkite-agent meta-data get "${key}" --default '' 2>/dev/null || true)"
    [[ -z "${value}" ]] && continue
    printf '%s\n' "${value}"
  done <<<"${failure_keys}" | sort -u
)

cd "${KIBANA_DIR:-${BUILDKITE_BUILD_CHECKOUT_PATH:-$(pwd)}}"

if ! node -e "require('yaml')" 2>/dev/null; then
  echo "--- Bootstrap (required for suite owner triage)"
  .buildkite/scripts/bootstrap.sh
fi

if [[ -z "${KBN_EVALS_CONFIG_B64:-}" && ( -z "${OPENROUTER_BASE_URL:-}" || -z "${OPENROUTER_API_KEY:-}" ) ]]; then
  echo "WARNING: KBN_EVALS_CONFIG_B64 and OPENROUTER_* are unset; triage requires vault OpenRouter credentials"
fi

FAILING_PROJECTS_CSV="$(IFS=,; echo "${failing_projects[*]}")"

if [[ -n "${slack_channel}" ]]; then
  SLACK_FILE="$(mktemp -t kbn-evals-triage-slack.XXXXXX.md)"
fi
if [[ -n "${pr_number}" ]]; then
  GITHUB_FILE="$(mktemp -t kbn-evals-triage-github.XXXXXX.md)"
fi

echo "--- Building suite triage message(s)"
if ! EVAL_SUITE_ID="$EVAL_SUITE_ID" \
  EVAL_FAILING_PROJECTS="$FAILING_PROJECTS_CSV" \
  EVAL_NOTIFY_MODE="$EVAL_NOTIFY_MODE" \
  EVAL_TRIAGE_SLACK_OUT="${SLACK_FILE}" \
  EVAL_TRIAGE_GITHUB_OUT="${GITHUB_FILE}" \
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/build_suite_owner_slack_message.js; then
  echo "--- build_suite_owner_slack_message crashed; writing static fallback summary"
  if [[ -n "${SLACK_FILE}" ]]; then
    {
      printf ':rotating_light: *%s* — %s (`%s`) failed.\n\n' "$header_label" "$suite_name" "$EVAL_SUITE_ID"
      printf '*Failing models:*\n'
      for project in "${failing_projects[@]}"; do printf -- '- `%s`\n' "${project}"; done
      [[ -n "${BUILDKITE_BUILD_URL:-}" ]] && printf '\n<%s|View build>\n' "${BUILDKITE_BUILD_URL}"
      printf '\n*Triage summary:*\n'
      printf '_Suite owner message builder failed. See the suite owner notify Buildkite step for details._\n'
    } >"$SLACK_FILE"
  fi
  if [[ -n "${GITHUB_FILE}" ]]; then
    {
      printf ':rotating_light: **%s** — %s (`%s`) failed.\n\n' "$header_label" "$suite_name" "$EVAL_SUITE_ID"
      printf '**Failing models:**\n'
      for project in "${failing_projects[@]}"; do printf -- '- `%s`\n' "${project}"; done
      [[ -n "${BUILDKITE_BUILD_URL:-}" ]] && printf '\n[View build](%s)\n' "${BUILDKITE_BUILD_URL}"
      printf '\n**Triage summary:**\n\n'
      printf '_Suite owner message builder failed. See the suite owner notify Buildkite step for details._\n'
    } >"$GITHUB_FILE"
  fi
fi

if [[ -n "${SLACK_FILE}" && -f "${SLACK_FILE}" ]]; then
  buildkite-agent meta-data set "kbn-evals:triage:${suite_key_safe}" "$(cat "$SLACK_FILE")" >/dev/null 2>&1 || true
fi

ANNOTATION_FILE="${SLACK_FILE:-${GITHUB_FILE}}"
if [[ -n "${ANNOTATION_FILE}" && -f "${ANNOTATION_FILE}" ]]; then
  echo "--- Suite failure summary"
  cat "$ANNOTATION_FILE"
  buildkite-agent annotate --context "kbn-evals-summary-${suite_key_safe}" --style 'error' "$(cat "$ANNOTATION_FILE")" || true
fi

# Record a per-suite job link so the weekly roll-up can deep-link to this suite's
# triage job (instead of one link per failing model).
if [[ -n "${BUILDKITE_BUILD_URL:-}" && -n "${BUILDKITE_JOB_ID:-}" ]]; then
  buildkite-agent meta-data set "kbn-evals:suite-job-url:${suite_key_safe}" \
    "${BUILDKITE_BUILD_URL}#${BUILDKITE_JOB_ID}" >/dev/null 2>&1 || true
fi

# --- Post to Slack --------------------------------------------------------
if [[ -n "${slack_channel}" && -n "${SLACK_FILE}" && -f "${SLACK_FILE}" ]]; then
  upload_slack_notify "$SLACK_FILE" hard_failed
fi

# --- Post a PR comment ----------------------------------------------------
if [[ -n "${pr_number}" && -n "${GITHUB_FILE}" && -f "${GITHUB_FILE}" ]]; then
  echo "--- Posting triage as a PR comment (elastic/kibana#${pr_number})"
  if ! node .buildkite/scripts/lifecycle/comment_on_pr.ts \
    --message "$(cat "$GITHUB_FILE")" \
    --context "evals-triage-${suite_key_safe}" \
    --clear-previous \
    --issue-number "$pr_number" \
    --repository-owner "elastic" \
    --repository "kibana"; then
    echo "WARNING: failed to post PR comment for suite ${EVAL_SUITE_ID}"
  fi
fi

exit 0
