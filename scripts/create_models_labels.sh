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
#   ./scripts/create_models_labels.sh llm-gateway/gpt-5.1 llm-gateway/gpt-5.1-chat ...
#
# Generate labels from discovery artifacts:
#   ./scripts/create_models_labels.sh --repo elastic/kibana \
#     --from-litellm-connectors-json /tmp/litellm_connectors.json \
#     --from-eis-models-json target/eis_models.json \
#     --judge litellm-llm-gateway-gpt-4o

usage() {
  cat >&2 <<'EOF'
Usage:
  ./scripts/create_models_labels.sh [--repo <owner/repo>] [--judge <connector-id> ...] [labels...]

Options:
  --update-all-labels                   Update all model + judge labels (LiteLLM + EIS) using default discovery sources
  --repo <owner/repo>                   Target repo for gh commands (default: current)
  --from-litellm-connectors-json <path> Create labels from a LiteLLM connectors JSON map
  --from-litellm-vault-config [path]    Create LiteLLM model labels via LiteLLM discovery using kbn-evals vault config
                                      (default: x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json)
  --from-eis-models-json [path]         Create labels from target/eis_models.json (default: target/eis_models.json)
  --judge-from-eis-models-json [path]   Create judge labels for all EIS models in eis_models.json (as models:judge:eis/<modelId>)
                                      (default: target/eis_models.json)
  --judge-from-litellm-vault-config [path]
                                      Create judge labels for all LiteLLM models via LiteLLM discovery using kbn-evals vault config
                                      (as models:judge:<model-group>, e.g. models:judge:llm-gateway/gpt-5.1)
                                      (default: x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json)
  --judge <connector-id>                Create models:judge:<connector-id> (repeatable)
  -h, --help                            Show help

Notes:
  - You can pass raw model groups (script will prefix models: automatically).
  - EIS model labels are created as: models:eis/<modelId>
EOF
}

MODELS_COLOR="${MODELS_LABEL_COLOR:-505D26}"
JUDGE_COLOR="${MODELS_JUDGE_LABEL_COLOR:-5319E7}"
DESC_PREFIX="${MODELS_LABEL_DESCRIPTION_PREFIX:-Run LLM evals against model: }"
JUDGE_DESC_PREFIX="${MODELS_JUDGE_LABEL_DESCRIPTION_PREFIX:-Override LLM-as-a-judge connector for evals: }"

REPO=""
FROM_LITELLM_CONNECTORS_JSON=""
FROM_LITELLM_VAULT_CONFIG=""
FROM_EIS_MODELS_JSON=""
JUDGE_FROM_EIS_MODELS_JSON=""
JUDGE_FROM_LITELLM_VAULT_CONFIG=""
UPDATE_ALL_LABELS="false"
declare -a JUDGE_CONNECTOR_IDS=()
declare -a POSITIONAL=()

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: 'gh' CLI is required." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: 'node' is required." >&2
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --update-all-labels)
      UPDATE_ALL_LABELS="true"
      shift 1
      ;;
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --from-litellm-connectors-json)
      FROM_LITELLM_CONNECTORS_JSON="${2:-}"
      shift 2
      ;;
    --from-litellm-vault-config)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        FROM_LITELLM_VAULT_CONFIG="${2}"
        shift 2
      else
        FROM_LITELLM_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
        shift 1
      fi
      ;;
    --from-eis-models-json)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        FROM_EIS_MODELS_JSON="${2}"
        shift 2
      else
        FROM_EIS_MODELS_JSON="target/eis_models.json"
        shift 1
      fi
      ;;
    --judge)
      JUDGE_CONNECTOR_IDS+=("${2:-}")
      shift 2
      ;;
    --judge-from-eis-models-json)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        JUDGE_FROM_EIS_MODELS_JSON="${2}"
        shift 2
      else
        JUDGE_FROM_EIS_MODELS_JSON="target/eis_models.json"
        shift 1
      fi
      ;;
    --judge-from-litellm-vault-config)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        JUDGE_FROM_LITELLM_VAULT_CONFIG="${2}"
        shift 2
      else
        JUDGE_FROM_LITELLM_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
        shift 1
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      POSITIONAL+=("$@")
      break
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

if [[ "${UPDATE_ALL_LABELS}" == "true" ]]; then
  # LiteLLM (from vault config)
  [[ -z "${FROM_LITELLM_VAULT_CONFIG}" ]] && FROM_LITELLM_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
  [[ -z "${JUDGE_FROM_LITELLM_VAULT_CONFIG}" ]] && JUDGE_FROM_LITELLM_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"

  # EIS (from discovery artifact)
  [[ -z "${FROM_EIS_MODELS_JSON}" ]] && FROM_EIS_MODELS_JSON="target/eis_models.json"
  [[ -z "${JUDGE_FROM_EIS_MODELS_JSON}" ]] && JUDGE_FROM_EIS_MODELS_JSON="target/eis_models.json"
fi

GH_REPO_ARGS=()
if [[ -n "${REPO}" ]]; then
  GH_REPO_ARGS+=(--repo "${REPO}")
fi

create_or_update_label() {
  local name="$1"
  local description="$2"
  local color="$3"

  if [[ -z "${name}" || "${name}" == "models:" || "${name}" == "models:eis/" || "${name}" == "models:judge:" ]]; then
    echo "Error: refusing to create an invalid label name: '${name}'" >&2
    exit 1
  fi

  # Prefer edit-first so we can update labels idempotently without relying on parsing "already exists" errors.
  if gh label edit "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color" >/dev/null 2>&1; then
    echo "updated: $name"
    return 0
  fi

  if gh label create "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color" >/dev/null 2>&1; then
    echo "created: $name"
    return 0
  fi

  echo "Error: failed to create or update label: $name" >&2
  exit 1
}

HAS_INPUTS="false"
if [[ -n "${FROM_LITELLM_CONNECTORS_JSON:-}" ]] || [[ -n "${FROM_LITELLM_VAULT_CONFIG:-}" ]] || [[ -n "${FROM_EIS_MODELS_JSON:-}" ]] || [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]] || [[ -n "${JUDGE_FROM_LITELLM_VAULT_CONFIG:-}" ]]; then
  HAS_INPUTS="true"
fi
if [[ "${#JUDGE_CONNECTOR_IDS[@]}" -gt 0 ]] || [[ "${#POSITIONAL[@]}" -gt 0 ]]; then
  HAS_INPUTS="true"
fi

if [[ "${HAS_INPUTS}" != "true" ]]; then
  usage
  exit 1
fi

create_or_update_label "models:all" "Run LLM evals against all available models" "$MODELS_COLOR"

generate_litellm_connectors_json_from_vault_config() {
  local cfg_path="$1"

  if [[ ! -f "${cfg_path}" ]]; then
    echo "Error: missing file: ${cfg_path}" >&2
    exit 1
  fi

  # Read required fields from the config using Node (no jq dependency).
  # Print them as tab-separated values to avoid re-parsing JSON multiple times in bash.
  local litellm_tsv
  litellm_tsv="$(
    node - <<'NODE' "${cfg_path}"
const Path = require('path');
const cfgPath = process.argv[2];
const cfg = require(Path.resolve(cfgPath));
const litellm = cfg && cfg.litellm ? cfg.litellm : {};
const baseUrl = litellm.baseUrl || '';
const teamId = litellm.teamId || '';
const virtualKey = litellm.virtualKey || '';
process.stdout.write([baseUrl, teamId, virtualKey].join('\t'));
NODE
  )"

  local base_url team_id virtual_key
  IFS=$'\t' read -r base_url team_id virtual_key <<<"${litellm_tsv}"

  if [[ -z "${base_url}" || -z "${team_id}" || -z "${virtual_key}" ]]; then
    echo "Error: missing litellm.baseUrl, litellm.teamId, or litellm.virtualKey in ${cfg_path}" >&2
    exit 1
  fi

  # Do not echo the key. Pass it directly to the generator script.
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
    --base-url "${base_url}" \
    --team-id "${team_id}" \
    --api-key "${virtual_key}" \
    --format json
}

if [[ -n "${FROM_LITELLM_CONNECTORS_JSON:-}" ]]; then
  if [[ ! -f "${FROM_LITELLM_CONNECTORS_JSON}" ]]; then
    echo "Error: missing file: ${FROM_LITELLM_CONNECTORS_JSON}" >&2
    exit 1
  fi

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  done < <(
    node - <<'NODE' "${FROM_LITELLM_CONNECTORS_JSON}"
const fs = require('fs');
const filePath = process.argv[2];
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);
const models = new Set();
for (const connector of Object.values(obj)) {
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m === 'string' && m.trim()) models.add(m.trim());
}
process.stdout.write([...models].sort().join('\n'));
NODE
  )
fi

if [[ -n "${FROM_LITELLM_VAULT_CONFIG:-}" ]]; then
  litellm_model_groups="$(
    generate_litellm_connectors_json_from_vault_config "${FROM_LITELLM_VAULT_CONFIG}" | node -e "
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(0, 'utf8'));
const models = new Set();
for (const connector of Object.values(obj)) {
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m === 'string' && m.trim()) models.add(m.trim());
}
process.stdout.write([...models].sort().join('\\n'));
"
  )"

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  done <<<"${litellm_model_groups}"
fi

if [[ -n "${FROM_EIS_MODELS_JSON:-}" ]]; then
  if [[ ! -f "${FROM_EIS_MODELS_JSON}" ]]; then
    echo "Error: missing file: ${FROM_EIS_MODELS_JSON}" >&2
    exit 1
  fi

  while IFS= read -r model_id; do
    [[ -z "$model_id" ]] && continue
    create_or_update_label "models:eis/${model_id}" "${DESC_PREFIX}eis/${model_id}" "$MODELS_COLOR"
  done < <(
    node - <<'NODE' "${FROM_EIS_MODELS_JSON}"
const fs = require('fs');
const filePath = process.argv[2];
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);
const models = new Set();
const list = Array.isArray(obj.models) ? obj.models : [];
for (const entry of list) {
  const id = entry && entry.modelId;
  if (typeof id === 'string' && id.trim()) models.add(id.trim());
}
process.stdout.write([...models].sort().join('\n'));
NODE
  )
fi

if [[ -n "${JUDGE_FROM_LITELLM_VAULT_CONFIG:-}" ]]; then
  litellm_connector_ids="$(
    generate_litellm_connectors_json_from_vault_config "${JUDGE_FROM_LITELLM_VAULT_CONFIG}" | node -e "
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(0, 'utf8'));
const models = new Set();
for (const connector of Object.values(obj)) {
  // Prefer the original model group from the connector name (e.g. 'LiteLLM llm-gateway/gpt-5.1-chat (via ...)').
  const name = connector && connector.name;
  if (typeof name === 'string' && name.startsWith('LiteLLM ')) {
    const raw = name.slice('LiteLLM '.length);
    const group = raw.replace(/ \\(via .*\\)$/, '').trim();
    if (group) models.add(group);
    continue;
  }

  // Fallback: use the request model (defaultModel).
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m === 'string' && m.trim()) models.add(m.trim());
}
process.stdout.write([...models].sort().join('\\n'));
"
  )"

  while IFS= read -r connector_id; do
    [[ -z "$connector_id" ]] && continue
    create_or_update_label "models:judge:${connector_id}" "${JUDGE_DESC_PREFIX}${connector_id}" "$JUDGE_COLOR"
  done <<<"${litellm_connector_ids}"
fi

if [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]]; then
  if [[ ! -f "${JUDGE_FROM_EIS_MODELS_JSON}" ]]; then
    echo "Error: missing file: ${JUDGE_FROM_EIS_MODELS_JSON}" >&2
    exit 1
  fi

  while IFS= read -r model_id; do
    [[ -z "$model_id" ]] && continue
    create_or_update_label "models:judge:eis/${model_id}" "${JUDGE_DESC_PREFIX}eis/${model_id}" "$JUDGE_COLOR"
  done < <(
    node - <<'NODE' "${JUDGE_FROM_EIS_MODELS_JSON}"
const fs = require('fs');
const filePath = process.argv[2];
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);
const list = Array.isArray(obj.models) ? obj.models : [];

const ids = new Set();
for (const entry of list) {
  const modelId = entry && entry.modelId;
  if (typeof modelId !== 'string' || !modelId.trim()) continue;
  ids.add(modelId.trim());
}

process.stdout.write([...ids].sort().join('\n'));
NODE
  )
fi

for judge_id in "${JUDGE_CONNECTOR_IDS[@]+"${JUDGE_CONNECTOR_IDS[@]}"}"; do
  [[ -z "$judge_id" ]] && continue
  create_or_update_label "models:judge:${judge_id}" "${JUDGE_DESC_PREFIX}${judge_id}" "$JUDGE_COLOR"
done

for arg in "${POSITIONAL[@]+"${POSITIONAL[@]}"}"; do
  label="$arg"
  if [[ "$label" != models:* ]]; then
    label="models:${label}"
  fi

  if [[ "$label" == "models:all" ]]; then
    create_or_update_label "$label" "Run LLM evals against all available models" "$MODELS_COLOR"
    continue
  fi

  if [[ "$label" == models:judge:* ]]; then
    judge_connector_id="${label#models:judge:}"
    create_or_update_label "$label" "${JUDGE_DESC_PREFIX}${judge_connector_id}" "$JUDGE_COLOR"
    continue
  else
    model_group="${label#models:}"
    create_or_update_label "$label" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  fi
done

