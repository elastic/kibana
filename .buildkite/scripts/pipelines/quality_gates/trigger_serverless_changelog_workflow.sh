#!/usr/bin/env bash

set -euo pipefail

WORKFLOW_FILE="generate_serverless_changelog.yml"
WORKFLOW_REF="main"
WORKFLOW_URL="https://github.com/elastic/kibana/actions/workflows/${WORKFLOW_FILE}"
WORKFLOW_RUNS_URL="${WORKFLOW_URL}?query=event%3Aworkflow_dispatch+branch%3A${WORKFLOW_REF}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required to dispatch the serverless changelog workflow" >&2
  exit 1
fi

if [[ -z "${SERVICE_VERSION:-}" ]]; then
  echo "SERVICE_VERSION is required to generate the serverless changelog" >&2
  exit 1
fi

if [[ -z "${TARGET_ENV:-}" ]]; then
  echo "TARGET_ENV is required to generate the serverless changelog" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to dispatch the serverless changelog workflow" >&2
  exit 1
fi

echo "--- Triggering ${WORKFLOW_FILE} for ${TARGET_ENV} at ${SERVICE_VERSION}"

payload="$(
  jq -n \
    --arg ref "${WORKFLOW_REF}" \
    --arg service_version "${SERVICE_VERSION}" \
    --arg target_env "${TARGET_ENV}" \
    --arg build_url "${BUILDKITE_BUILD_URL:-}" \
    --arg build_message "${BUILDKITE_MESSAGE:-}" \
    '{
      ref: $ref,
      inputs: {
        service_version: $service_version,
        target_env: $target_env,
        build_url: $build_url,
        build_message: $build_message
      }
    }'
)"

response_file="$(mktemp)"
status_code="$(
  curl -sS \
    -o "${response_file}" \
    -w "%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/elastic/kibana/actions/workflows/${WORKFLOW_FILE}/dispatches" \
    -d "${payload}" || true
)"

if [[ "${status_code}" != "204" && "${status_code}" != "200" ]]; then
  echo "Failed to dispatch ${WORKFLOW_FILE}. GitHub API returned ${status_code}:" >&2
  cat "${response_file}" >&2
  rm -f "${response_file}"
  exit 1
fi

workflow_run_url=""
if [[ -s "${response_file}" ]]; then
  workflow_run_url="$(jq -r '.html_url // empty' <"${response_file}")"
fi

rm -f "${response_file}"
echo "Triggered ${WORKFLOW_FILE} for ${TARGET_ENV} at ${SERVICE_VERSION}"
echo "Workflow runs: ${workflow_run_url:-${WORKFLOW_RUNS_URL}}"
