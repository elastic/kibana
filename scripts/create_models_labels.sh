#!/usr/bin/env bash
set -euo pipefail

# Create `models:*` GitHub labels for Kibana.
#
# Usage:
#   ./scripts/create_models_labels.sh models:all \
#     models:llm-gateway/gpt-5.1 \
#     models:llm-gateway/gpt-5.1-chat
#
# Or pass raw model group names (it will prefix `models:` automatically):
#   ./scripts/create_models_labels.sh llm-gateway/gpt-5.1 llm-gateway/gpt-5.1-chat llm-gateway/gpt-5.2 llm-gateway/gpt-5.2-codex llm-gateway/gpt-5.2-chat llm-gateway/claude-opus-4-5 llm-gateway/claude-sonnet-4-5 llm-gateway/claude-haiku-4-5 llm-gateway/claude-opus-4-6

COLOR="${MODELS_LABEL_COLOR:-505D26}"
DESC_PREFIX="${MODELS_LABEL_DESCRIPTION_PREFIX:-Run LLM evals against model: }"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: 'gh' CLI is required." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <models:all|models:<model-group>|<model-group>> [... more]" >&2
  exit 1
fi

create_or_update_label() {
  local name="$1"
  local description="$2"

  if gh label create "$name" --description "$description" --color "$COLOR" >/dev/null 2>&1; then
    echo "created: $name"
    return 0
  fi

  # If it already exists, keep it updated/idempotent.
  gh label edit "$name" --description "$description" --color "$COLOR" >/dev/null 2>&1 || true
  echo "updated: $name"
}

for arg in "$@"; do
  label="$arg"
  if [[ "$label" != models:* ]]; then
    label="models:${label}"
  fi

  if [[ "$label" == "models:all" ]]; then
    create_or_update_label "$label" "Run LLM evals against all LiteLLM models"
  else
    model_group="${label#models:}"
    create_or_update_label "$label" "${DESC_PREFIX}${model_group}"
  fi
done

