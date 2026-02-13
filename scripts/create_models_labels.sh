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
  --repo <owner/repo>                   Target repo for gh commands (default: current)
  --from-litellm-connectors-json <path> Create labels from a LiteLLM connectors JSON map
  --from-eis-models-json <path>         Create labels from target/eis_models.json
  --judge-from-eis-models-json [path]   Create judge labels for all EIS models in eis_models.json (default: target/eis_models.json)
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
FROM_EIS_MODELS_JSON=""
JUDGE_FROM_EIS_MODELS_JSON=""
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
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --from-litellm-connectors-json)
      FROM_LITELLM_CONNECTORS_JSON="${2:-}"
      shift 2
      ;;
    --from-eis-models-json)
      FROM_EIS_MODELS_JSON="${2:-}"
      shift 2
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
if [[ -n "${FROM_LITELLM_CONNECTORS_JSON:-}" ]] || [[ -n "${FROM_EIS_MODELS_JSON:-}" ]] || [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]]; then
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

if [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]]; then
  if [[ ! -f "${JUDGE_FROM_EIS_MODELS_JSON}" ]]; then
    echo "Error: missing file: ${JUDGE_FROM_EIS_MODELS_JSON}" >&2
    exit 1
  fi

  while IFS= read -r connector_id; do
    [[ -z "$connector_id" ]] && continue
    create_or_update_label "models:judge:${connector_id}" "${JUDGE_DESC_PREFIX}${connector_id}" "$JUDGE_COLOR"
  done < <(
    node - <<'NODE' "${JUDGE_FROM_EIS_MODELS_JSON}"
const fs = require('fs');
const filePath = process.argv[2];
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);
const list = Array.isArray(obj.models) ? obj.models : [];

const sanitize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const ids = new Set();
for (const entry of list) {
  const modelId = entry && entry.modelId;
  if (typeof modelId !== 'string' || !modelId.trim()) continue;
  ids.add(`eis-${sanitize(modelId)}`);
}

process.stdout.write([...ids].sort().join('\n'));
NODE
  )
fi

for judge_id in "${JUDGE_CONNECTOR_IDS[@]:-}"; do
  [[ -z "$judge_id" ]] && continue
  create_or_update_label "models:judge:${judge_id}" "${JUDGE_DESC_PREFIX}${judge_id}" "$JUDGE_COLOR"
done

for arg in "${POSITIONAL[@]:-}"; do
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

