#!/usr/bin/env bash

set -euo pipefail

if [[ "${KBN_EVALS_WEEKLY:-}" != "1" ]] && [[ "${KBN_EVALS_WEEKLY:-}" != "true" ]]; then
  echo "weekly_build_slack_summary.sh is only for weekly evals (KBN_EVALS_WEEKLY=1)"
  exit 0
fi

if ! command -v buildkite-agent >/dev/null 2>&1; then
  echo "buildkite-agent is required"
  exit 1
fi

all_keys="$(buildkite-agent meta-data keys 2>/dev/null || true)"

triage_keys="$(printf '%s\n' "${all_keys}" | grep -E '^kbn-evals:triage:' || true)"
failure_keys="$(printf '%s\n' "${all_keys}" | grep -E '^kbn-evals:suite-failures:' || true)"

if [[ -z "${triage_keys}" && -z "${failure_keys}" ]]; then
  echo "No weekly eval failures recorded in build metadata"
  exit 0
fi

declare -A suite_has_triage=()
declare -A suite_has_failure=()

while IFS= read -r key; do
  [[ -z "${key}" ]] && continue
  suite_id="${key#kbn-evals:triage:}"
  suite_has_triage["${suite_id}"]=1
done <<<"${triage_keys}"

while IFS= read -r key; do
  [[ -z "${key}" ]] && continue
  rest="${key#kbn-evals:suite-failures:}"
  suite_id="${rest%%:*}"
  [[ -n "${suite_id}" ]] && suite_has_failure["${suite_id}"]=1
done <<<"${failure_keys}"

suite_ids=()
for suite_id in "${!suite_has_triage[@]}" "${!suite_has_failure[@]}"; do
  suite_ids+=("${suite_id}")
done

if [[ "${#suite_ids[@]}" -eq 0 ]]; then
  exit 0
fi

mapfile -t suite_ids < <(printf '%s\n' "${suite_ids[@]}" | sort -u)

summary_file="$(mktemp -t kbn-evals-weekly-slack.XXXXXX.md)"
{
  echo ":rotating_light: *Weekly LLM evals* had failing suites"
  if [[ -n "${BUILDKITE_BUILD_URL:-}" ]]; then
    echo ""
    echo "<${BUILDKITE_BUILD_URL}|${BUILDKITE_PIPELINE_NAME:-Buildkite} #${BUILDKITE_BUILD_NUMBER:-}>"
  fi
  echo ""
} >"$summary_file"

for suite_id in "${suite_ids[@]}"; do
  triage_key="kbn-evals:triage:${suite_id}"
  triage_body="$(buildkite-agent meta-data get "${triage_key}" --default '' 2>/dev/null || true)"

  {
    echo "---"
    echo ""
  } >>"$summary_file"

  if [[ -n "${triage_body}" ]]; then
    printf '%s\n' "${triage_body}" >>"$summary_file"
    continue
  fi

  failures_prefix="kbn-evals:suite-failures:${suite_id}:"
  echo "*Suite \`${suite_id}\`* failed (no suite summary metadata)."
  echo ""
  echo "Failing connector projects:"
  while IFS= read -r key; do
    [[ -z "${key}" ]] && continue
    [[ "${key}" != "${failures_prefix}"* ]] && continue
    value="$(buildkite-agent meta-data get "${key}" --default '' 2>/dev/null || true)"
    [[ -z "${value}" ]] && continue
    printf -- '- `%s`\n' "${value}"
  done <<<"${failure_keys}" >>"$summary_file"
done

aggregate_body="$(cat "$summary_file")"
rm -f "$summary_file"

# Buildkite metadata limit is ~100KB
if [[ "${#aggregate_body}" -gt 95000 ]]; then
  aggregate_body="${aggregate_body:0:95000}

_(truncated for Buildkite metadata size limit)_"
fi

buildkite-agent annotate --context 'kbn-evals-weekly-failures' --style 'error' "$aggregate_body" || true

if [[ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" =~ ^(1|true)$ ]]; then
  buildkite-agent meta-data set 'slack:kbn_evals_weekly_failures:body' "$aggregate_body" >/dev/null 2>&1 || true
fi

echo "$aggregate_body"
exit 1
