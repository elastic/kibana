#!/usr/bin/env bash

set -euo pipefail

# Generate KIBANA_TESTING_AI_CONNECTORS from LiteLLM (when needed).
#
# This script is sourced by run_suite.sh after the pre-command hook has
# exported KBN_EVALS_CONFIG_B64 and EVALUATION_CONNECTOR_ID.
#
# When EVAL_MODEL_GROUPS contains only EIS models (eis/...) and the judge
# connector is also EIS-backed (or unset), LiteLLM connector generation is
# skipped entirely. This avoids failing eval runs when the LiteLLM team
# budget is exhausted but the eval doesn't need LiteLLM at all.

if [[ -z "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  echo "ERROR: KBN_EVALS_CONFIG_B64 is not set. Was setup_job_env.sh sourced?"
  exit 1
fi

KBN_EVALS_CONFIG_JSON="$(printf '%s' "$KBN_EVALS_CONFIG_B64" | base64 -d)"

LITELLM_BASE_URL="$(jq -r '.litellm.baseUrl // empty' <<<"$KBN_EVALS_CONFIG_JSON")"
LITELLM_VIRTUAL_KEY="$(jq -r '.litellm.virtualKey // empty' <<<"$KBN_EVALS_CONFIG_JSON")"
LITELLM_TEAM_ID="$(jq -r '.litellm.teamId // empty' <<<"$KBN_EVALS_CONFIG_JSON")"
LITELLM_TEAM_NAME="$(jq -r '.litellm.teamName // "kibana-ci-evals"' <<<"$KBN_EVALS_CONFIG_JSON")"

NEED_LITELLM_CONNECTORS="true"

# Check 1: If EVAL_MODEL_GROUPS only contains EIS models, LiteLLM is not needed.
if [[ -n "${EVAL_MODEL_GROUPS:-}" ]]; then
  _all_eis="true"
  IFS=',' read -ra _model_groups <<< "$EVAL_MODEL_GROUPS"
  for _mg in "${_model_groups[@]}"; do
    _mg="${_mg## }"; _mg="${_mg%% }"
    if [[ -n "$_mg" ]] && [[ "$_mg" != eis/* ]]; then
      _all_eis="false"
      break
    fi
  done
  if [[ "$_all_eis" == "true" ]]; then
    NEED_LITELLM_CONNECTORS="false"
  fi
fi

# Check 2: Fanout child steps set EVAL_PROJECT to a connector id.
# If the project is EIS-backed, this step only needs EIS connectors.
if [[ -n "${EVAL_PROJECT:-}" ]] && [[ "${EVAL_PROJECT}" == eis-* ]]; then
  NEED_LITELLM_CONNECTORS="false"
fi

# Override: if the judge connector is LiteLLM-backed, we always need LiteLLM.
if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]] && [[ "${EVALUATION_CONNECTOR_ID}" == litellm-* ]]; then
  NEED_LITELLM_CONNECTORS="true"
fi

if [[ "$NEED_LITELLM_CONNECTORS" == "true" ]]; then
  echo "--- Generating LiteLLM connectors"

  if [[ -n "${LITELLM_TEAM_ID:-}" ]]; then
    KIBANA_TESTING_AI_CONNECTORS="$(
      node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
        --base-url "$LITELLM_BASE_URL" \
        --team-id "$LITELLM_TEAM_ID" \
        --api-key "$LITELLM_VIRTUAL_KEY" \
        --model-prefix "llm-gateway/"
    )"
  else
    KIBANA_TESTING_AI_CONNECTORS="$(
      node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
        --base-url "$LITELLM_BASE_URL" \
        --team-name "$LITELLM_TEAM_NAME" \
        --api-key "$LITELLM_VIRTUAL_KEY" \
        --model-prefix "llm-gateway/"
    )"
  fi
  export KIBANA_TESTING_AI_CONNECTORS

  if [[ -z "${KIBANA_TESTING_AI_CONNECTORS:-}" ]]; then
    echo "ERROR: Failed to generate KIBANA_TESTING_AI_CONNECTORS (empty output)."
    exit 1
  fi

  if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]] && [[ "${EVALUATION_CONNECTOR_ID}" == litellm-* ]]; then
    if ! node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);const id=process.env.EVALUATION_CONNECTOR_ID;process.exit(Object.prototype.hasOwnProperty.call(o,id)?0:1);" ; then
      echo "ERROR: EVALUATION_CONNECTOR_ID ($EVALUATION_CONNECTOR_ID) is not present in generated connectors."
      echo "Sample generated connector ids:"
      node -e "const b=process.env.KIBANA_TESTING_AI_CONNECTORS||'';const s=Buffer.from(b,'base64').toString('utf8');const o=JSON.parse(s);console.log(Object.keys(o).slice(0,20).join('\\n'));"
      exit 1
    fi
  fi
else
  echo "--- Skipping LiteLLM connector generation (only EIS models requested)"
  KIBANA_TESTING_AI_CONNECTORS="$(printf '{}' | base64)"
  export KIBANA_TESTING_AI_CONNECTORS
fi
