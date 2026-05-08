#!/usr/bin/env bash

set -euo pipefail

ACCESS_BROKER_URL="${ACCESS_BROKER_URL:-https://access-broker-261553193300.us-central1.run.app}"
CAPABILITY="kibana.litellm"
MODEL="llm-gateway/gpt-5.4-mini"

# Validation phase: always cancel the rest of the build after this step runs,
# pass or fail. Remove this trap (and the cancel block below) once the
# access-broker integration is confirmed and the full pull_request pipeline
# should run on every PR.
cancel_remaining_build() {
  local exit_code=$?
  echo "--- Cancelling remaining build steps (validation phase)"
  if [[ -z "${BUILDKITE_TOKEN:-}" ]]; then
    echo "BUILDKITE_TOKEN not set; skipping cancel" >&2
    return 0
  fi

  local cancel_url="https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG}/pipelines/${BUILDKITE_PIPELINE_SLUG}/builds/${BUILDKITE_BUILD_NUMBER}/cancel"
  local cancel_status
  cancel_status="$(
    curl --silent --show-error \
      --output /dev/null \
      --write-out '%{http_code}' \
      --request PUT \
      --header "Authorization: Bearer $BUILDKITE_TOKEN" \
      "$cancel_url" || echo "000"
  )"

  if [[ "$cancel_status" =~ ^2 ]]; then
    echo "Cancel requested (HTTP $cancel_status) — Buildkite will stop remaining jobs."
  else
    echo "Cancel request returned HTTP $cancel_status; smoke test exit code was $exit_code." >&2
  fi
}
trap cancel_remaining_build EXIT

echo "--- Minting Buildkite OIDC token"
OIDC_TOKEN="$(
  buildkite-agent oidc request-token \
    --audience elastic-access-broker \
    --lifetime 300 \
    --claim "organization_slug,pipeline_id,build_id,cluster_id,queue_id,queue_key"
)"

echo "--- Calling access-broker LiteLLM proxy ($MODEL)"
RESPONSE_FILE="$(mktemp)"
HTTP_STATUS="$(
  curl --silent --show-error \
    --output "$RESPONSE_FILE" \
    --write-out '%{http_code}' \
    --request POST \
    --header "Authorization: Bearer $OIDC_TOKEN" \
    --header "Content-Type: application/json" \
    --data @- \
    "$ACCESS_BROKER_URL/proxy/$CAPABILITY/v1/chat/completions" <<JSON
{
  "model": "$MODEL",
  "messages": [
    {
      "role": "user",
      "content": "Write a short, cheerful four-line poem about Kibana CI passing on the first try."
    }
  ]
}
JSON
)"

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "^^^ +++"
  echo "access-broker call failed: HTTP $HTTP_STATUS" >&2
  cat "$RESPONSE_FILE" >&2
  exit 1
fi

echo "--- Poem from $MODEL via access-broker"
if command -v jq >/dev/null 2>&1; then
  jq -r '.choices[0].message.content' "$RESPONSE_FILE"
else
  cat "$RESPONSE_FILE"
fi
