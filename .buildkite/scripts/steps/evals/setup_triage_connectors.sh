#!/usr/bin/env bash

set -euo pipefail

# Prepare KIBANA_TESTING_AI_CONNECTORS for suite_owner_notify judge triage.
# Ensures the judge connector (LiteLLM or EIS) is present even when eval fanout only used EIS models.

if [[ -z "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  echo "ERROR: KBN_EVALS_CONFIG_B64 is not set. Was setup_job_env.sh sourced?"
  exit 1
fi

export KBN_EVALS_SUITE_OWNER_NOTIFY=1

KBN_EVALS_CONFIG_JSON="$(printf '%s' "$KBN_EVALS_CONFIG_B64" | base64 -d)"
_vault_judge_id="$(jq -r '.evaluationConnectorId // empty' <<<"$KBN_EVALS_CONFIG_JSON")"
_judge_id="${EVALUATION_CONNECTOR_ID:-${_vault_judge_id}}"

if [[ -z "${_judge_id}" ]]; then
  echo "ERROR: EVALUATION_CONNECTOR_ID is not set and vault evaluationConnectorId is empty"
  exit 1
fi

export EVALUATION_CONNECTOR_ID="${_judge_id}"

source .buildkite/scripts/steps/evals/setup_connectors.sh

if [[ "${_judge_id}" != eis-* ]]; then
  exit 0
fi

if [[ ! "${FTR_EIS_CCM:-}" =~ ^(1|true)$ ]]; then
  echo "WARNING: EIS judge requires FTR_EIS_CCM=1 to load connector definitions; triage may fail"
  exit 0
fi

if [[ -z "${KIBANA_EIS_CCM_API_KEY:-}" ]]; then
  echo "WARNING: KIBANA_EIS_CCM_API_KEY is missing; cannot load EIS judge connector for triage"
  exit 0
fi

echo "--- Discovering EIS models for judge triage connectors"
if ! node scripts/discover_eis_models.js; then
  echo "WARNING: EIS model discovery failed; judge triage may be skipped"
  exit 0
fi

echo "--- Generating EIS connectors for judge triage"
EIS_CONNECTORS_B64="$(
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js
)"
export EIS_CONNECTORS_B64

echo "--- Merging LiteLLM + EIS connectors for judge triage"
export KIBANA_TESTING_AI_CONNECTORS="$(
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/merge_ai_connectors.js
)"
