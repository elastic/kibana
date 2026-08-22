#!/usr/bin/env bash

set -euo pipefail

# Sync GitHub `models:*` and `models:judge:*` labels from LiteLLM + EIS model discovery.
#
# This step discovers models from both sources and runs create_models_labels.sh, creating and
# updating labels for active models. Labels for decommissioned models are only deprecated
# (`--prune`) when both sources reported successfully: a source that is missing looks exactly
# like "every model from that source is gone", which would deprecate labels for live models.
#
# Required env vars (set automatically by pre-command hook via setup_job_env.sh):
#   KBN_EVALS_CONFIG_B64   - base64-encoded vault config (when KBN_EVALS=1)
#   KIBANA_EIS_CCM_API_KEY - EIS Cloud Connected Mode API key (when FTR_EIS_CCM=1)
#   GITHUB_TOKEN           - for gh CLI label operations (always set)

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

LABEL_ARGS=()

# Target repo (configurable via env, defaults to elastic/kibana)
LABEL_SYNC_REPO="${LABEL_SYNC_REPO:-elastic/kibana}"
LABEL_ARGS+=(--repo "${LABEL_SYNC_REPO}")

# --- Source 1: EIS model discovery ---
# Starts a temporary ES cluster with EIS CCM, discovers chat_completion models,
# and writes target/eis_models.json.
EIS_DISCOVERY_OK="false"

echo "--- EIS model discovery"
if [[ -n "${KIBANA_EIS_CCM_API_KEY:-}" ]]; then
  MAX_ATTEMPTS=2
  for attempt in $(seq 1 $MAX_ATTEMPTS); do
    echo "EIS discovery attempt ${attempt}/${MAX_ATTEMPTS}"

    if node scripts/discover_eis_models.js; then
      echo "EIS discovery complete"
      if [[ -s "target/eis_models.json" ]] && grep -q '"modelId"' target/eis_models.json; then
        cat target/eis_models.json
        EIS_DISCOVERY_OK="true"
      else
        echo "Warning: EIS discovery produced no models" >&2
      fi
      break
    fi

    if [[ "$attempt" -eq "$MAX_ATTEMPTS" ]]; then
      echo "Warning: EIS discovery failed after ${MAX_ATTEMPTS} attempts; continuing without EIS models" >&2
    else
      echo "EIS discovery failed, retrying in 10s..."
      sleep 10
    fi
  done
else
  echo "Warning: KIBANA_EIS_CCM_API_KEY not set; skipping EIS model discovery" >&2
fi

if [[ "${EIS_DISCOVERY_OK}" == "true" ]]; then
  LABEL_ARGS+=(--from-eis-models-json "target/eis_models.json")
  LABEL_ARGS+=(--judge-from-eis-models-json "target/eis_models.json")
fi

# --- Source 2: LiteLLM model discovery ---
# Decode vault config from KBN_EVALS_CONFIG_B64 to a temp file so create_models_labels.sh
# can read LiteLLM credentials (baseUrl, virtualKey).
VAULT_CONFIG_TMP=""
LITELLM_CONFIG_OK="false"

echo "--- LiteLLM model discovery"
if [[ -n "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  VAULT_CONFIG_TMP="$(mktemp)"
  printf '%s' "$KBN_EVALS_CONFIG_B64" | base64 -d > "$VAULT_CONFIG_TMP"
  LABEL_ARGS+=(--from-litellm-vault-config "$VAULT_CONFIG_TMP")
  LABEL_ARGS+=(--judge-from-litellm-vault-config "$VAULT_CONFIG_TMP")
  LITELLM_CONFIG_OK="true"
else
  echo "Warning: KBN_EVALS_CONFIG_B64 not set; skipping LiteLLM model labels" >&2
fi

if [[ "${EIS_DISCOVERY_OK}" != "true" && "${LITELLM_CONFIG_OK}" != "true" ]]; then
  echo "Error: neither EIS nor LiteLLM models could be discovered; nothing to sync." >&2
  exit 1
fi

if [[ "${EIS_DISCOVERY_OK}" == "true" && "${LITELLM_CONFIG_OK}" == "true" ]]; then
  LABEL_ARGS+=(--prune)
else
  echo "Warning: not all model sources are available; syncing labels without --prune" >&2
fi

# Clean up temp file on exit
cleanup() {
  rm -f "${VAULT_CONFIG_TMP:-}"
}
trap cleanup EXIT

# --- Sync labels for both sources ---
echo "--- Syncing models:* and models:judge:* labels"
./scripts/create_models_labels.sh "${LABEL_ARGS[@]}"

echo "--- Label sync complete"
