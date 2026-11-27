#!/usr/bin/env bash

set -euo pipefail

# Runs one nightshift-evals task against one model (connector) on this agent.
# Env: NIGHTSHIFT_EVAL_TASK, NIGHTSHIFT_EVAL_CONNECTOR_ID (empty = Kibana default),
#      NIGHTSHIFT_EVAL_ARGS (extra `eval` flags), NIGHTSHIFT_EVAL_DOWNLOADS (JSON).

NIGHTSHIFT_EVAL_TASK="${NIGHTSHIFT_EVAL_TASK:?NIGHTSHIFT_EVAL_TASK is required}"
NIGHTSHIFT_EVAL_CONNECTOR_ID="${NIGHTSHIFT_EVAL_CONNECTOR_ID:-}"
NIGHTSHIFT_EVAL_ARGS="${NIGHTSHIFT_EVAL_ARGS:-}"
NIGHTSHIFT_EVAL_DOWNLOADS="${NIGHTSHIFT_EVAL_DOWNLOADS:-[]}"
NIGHTSHIFT_UV_VERSION="${NIGHTSHIFT_UV_VERSION:-0.9.5}"

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/nightshift_evals/common.sh

connector_key="${NIGHTSHIFT_EVAL_CONNECTOR_ID:-default}"
# Inside the checkout so `buildkite-agent artifact upload` can reach it.
OUT_DIR="$KIBANA_DIR/target/nightshift-evals/${NIGHTSHIFT_EVAL_TASK}-${connector_key}"
mkdir -p "$OUT_DIR"

TMP_DIR="$(mktemp -d)"

cleanup() {
  local exit_status=$?
  trap - EXIT
  # The config holds the results cluster API key and the key file holds GCS credentials.
  rm -rf "$TMP_DIR"
  # The artifact globs are relative to the Kibana checkout, and the run moved into nightshift-evals.
  cd "$KIBANA_DIR"
  if command -v buildkite-agent >/dev/null 2>&1; then
    buildkite-agent artifact upload "target/nightshift-evals/${NIGHTSHIFT_EVAL_TASK}-${connector_key}/**/*" || true
    summaries="$(find "$OUT_DIR" -name summary.md | sort)"
    if [[ -n "$summaries" ]]; then
      # shellcheck disable=SC2086
      { printf 'nightshift-evals at `%s`\n\n' "${NIGHTSHIFT_EVALS_SHA:-unknown}"; cat $summaries; } | buildkite-agent annotate \
        --style "$([[ $exit_status -eq 0 ]] && echo info || echo warning)" \
        --context "nightshift-evals-${NIGHTSHIFT_EVAL_TASK}-${connector_key}" || true
    fi
  fi
  exit "$exit_status"
}
trap cleanup EXIT

echo "--- Bootstrap Kibana"
.buildkite/scripts/bootstrap.sh

echo "--- Install uv ${NIGHTSHIFT_UV_VERSION}"
export UV_INSTALL_DIR="$TMP_DIR/uv-bin"
export UV_UNMANAGED_INSTALL="$UV_INSTALL_DIR"
curl -LsSf "https://astral.sh/uv/${NIGHTSHIFT_UV_VERSION}/install.sh" | sh
export PATH="$UV_INSTALL_DIR:$PATH"

echo "--- Clone nightshift-evals"
nightshift_clone
NIGHTSHIFT_EVALS_SHA="$(git -C "$NIGHTSHIFT_EVALS_DIR" rev-parse HEAD)"

cd "$NIGHTSHIFT_EVALS_DIR"

echo "--- Install nightshift-evals dependencies"
uv sync --locked

if [[ "$NIGHTSHIFT_EVAL_DOWNLOADS" != "[]" ]]; then
  echo "--- Download task data"
  if [[ -z "${GCS_CREDENTIALS:-}" ]]; then
    echo "GCS_CREDENTIALS is not set; was KBN_EVALS=1 set for this step?" >&2
    exit 1
  fi
  # A private gcloud config, so the agent's own credentials stay untouched.
  export CLOUDSDK_CONFIG="$TMP_DIR/gcloud"
  mkdir -p "$CLOUDSDK_CONFIG"
  (umask 077 && printf '%s' "$GCS_CREDENTIALS" >"$TMP_DIR/gcs-key.json")
  gcloud auth activate-service-account --key-file="$TMP_DIR/gcs-key.json"

  while IFS=$'\t' read -r src dest recursive; do
    mkdir -p "$(dirname "$dest")"
    if [[ "$recursive" == "true" ]]; then
      mkdir -p "$dest"
      gcloud storage rsync -r "$src" "$dest"
    else
      gcloud storage cp "$src" "$dest"
    fi
  done < <(printf '%s' "$NIGHTSHIFT_EVAL_DOWNLOADS" | jq -r '.[] | [.src, .dest, (.recursive // false)] | @tsv')
  unset CLOUDSDK_CONFIG
fi

# nightshift-evals reads the results cluster key from this file, so the key is unset in the
# environment of the run below.
CONFIG_FILE="$TMP_DIR/config.yaml"
(
  umask 077
  jq -n \
    --arg kibanaDir "$KIBANA_DIR" \
    --arg connectorId "$NIGHTSHIFT_EVAL_CONNECTOR_ID" \
    --arg url "${EVAL_KBN_URL:?EVAL_KBN_URL is not set; was KBN_EVALS=1 set for this step?}" \
    --arg apiKey "${EVAL_KBN_API_KEY:?EVAL_KBN_API_KEY is not set}" \
    '{kibanaDir: $kibanaDir, evaluationsKbn: {url: $url, apiKey: $apiKey}}
      + (if $connectorId == "" then {} else {connectorId: $connectorId} end)' >"$CONFIG_FILE"
)

echo "--- Run ${NIGHTSHIFT_EVAL_TASK} (${connector_key})"
read -r -a extra_args <<<"$NIGHTSHIFT_EVAL_ARGS"
# The run, and the Kibana it starts from this checkout, do not need the results key, the whole Vault
# config or the GCS credentials that setup_job_env.sh exports for KBN_EVALS=1 steps.
env -u EVAL_KBN_API_KEY -u KBN_EVALS_CONFIG_B64 -u GCS_CREDENTIALS \
  uv run eval "$NIGHTSHIFT_EVAL_TASK" \
  --config "$CONFIG_FILE" \
  --results-dir "$OUT_DIR/results" \
  --stack-logs "$OUT_DIR/logs" \
  ${extra_args[@]+"${extra_args[@]}"}
