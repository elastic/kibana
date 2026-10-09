#!/usr/bin/env bash
set -euo pipefail

# Create `models:*` GitHub labels for Kibana.
#
# Usage:
#   ./scripts/create_models_labels.sh models:all \
#     models:openrouter/openai-gpt-5.4 \
#     models:openrouter/anthropic-claude-sonnet-4.6
#
# Or pass raw model group names (it will prefix `models:` automatically):
#   ./scripts/create_models_labels.sh openrouter/openai-gpt-5.4 openrouter/anthropic-claude-sonnet-4.6 ...
#
# Generate labels from discovery artifacts:
#   ./scripts/create_models_labels.sh --repo elastic/kibana \
#     --from-openrouter-connectors-json /tmp/openrouter_connectors.json \
#     --from-eis-models-json target/eis_models.json \
#     --judge openrouter-openai-gpt-5-4

usage() {
  cat >&2 <<'EOF'
Usage:
  ./scripts/create_models_labels.sh [--repo <owner/repo>] [--judge <connector-id> ...] [labels...]

Options:
  --update-all-labels                   Update all model + judge labels (OpenRouter + EIS) using default discovery sources
  --repo <owner/repo>                   Target repo for gh commands (default: current)
  --from-openrouter-connectors-json <path> Create labels from an OpenRouter connectors JSON map
  --from-openrouter-vault-config [path] Create OpenRouter model labels via OpenRouter discovery using kbn-evals vault config
                                      (default: x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json)
  --from-eis-models-json [path]         Create labels from target/eis_models.json (default: target/eis_models.json)
  --judge-from-eis-models-json [path]   Create judge labels for all EIS models in eis_models.json (as models:judge:eis/<modelId>)
                                      (default: target/eis_models.json)
  --judge-from-openrouter-vault-config [path]
                                      Create judge labels for all OpenRouter models via OpenRouter discovery using kbn-evals vault config
                                      (as models:judge:<model-group>, e.g. models:judge:openrouter/openai-gpt-5.4)
                                      (default: x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json)
  --judge <connector-id>                Create models:judge:<connector-id> (repeatable)
  --prune                                Mark stale models:* labels as deprecated (renamed to "deprecated:<name>")
  --dry-run                             Print labels that would be created/updated; do not call gh
  -h, --help                            Show help

Notes:
  - You can pass raw model groups (script will prefix models: automatically).
  - EIS model labels are created as: models:eis/<modelId>
  - Use --prune with discovery flags to deprecate labels for models no longer available.
  - --dry-run prints the labels that would be written and does not call gh (including --prune).
EOF
}

MODELS_COLOR="${MODELS_LABEL_COLOR:-505D26}"
JUDGE_COLOR="${MODELS_JUDGE_LABEL_COLOR:-5319E7}"
DESC_PREFIX="${MODELS_LABEL_DESCRIPTION_PREFIX:-Run LLM evals against model: }"
JUDGE_DESC_PREFIX="${MODELS_JUDGE_LABEL_DESCRIPTION_PREFIX:-Override LLM-as-a-judge connector for evals: }"

REPO=""
FROM_OPENROUTER_CONNECTORS_JSON=""
FROM_OPENROUTER_VAULT_CONFIG=""
FROM_EIS_MODELS_JSON=""
JUDGE_FROM_EIS_MODELS_JSON=""
JUDGE_FROM_OPENROUTER_VAULT_CONFIG=""
UPDATE_ALL_LABELS="false"
PRUNE="false"
DRY_RUN="false"
declare -a JUDGE_CONNECTOR_IDS=()
declare -a POSITIONAL=()

# Counters for summary reporting
CREATED_COUNT=0
UPDATED_COUNT=0
DEPRECATED_COUNT=0
SKIPPED_COUNT=0

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
    --prune)
      PRUNE="true"
      shift 1
      ;;
    --dry-run)
      DRY_RUN="true"
      shift 1
      ;;
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --from-openrouter-connectors-json)
      FROM_OPENROUTER_CONNECTORS_JSON="${2:-}"
      shift 2
      ;;
    --from-openrouter-vault-config)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        FROM_OPENROUTER_VAULT_CONFIG="${2}"
        shift 2
      else
        FROM_OPENROUTER_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
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
    --judge-from-openrouter-vault-config)
      # Optional path argument. If the next token is absent or looks like another flag, use default.
      if [[ -n "${2:-}" && "${2:-}" != --* ]]; then
        JUDGE_FROM_OPENROUTER_VAULT_CONFIG="${2}"
        shift 2
      else
        JUDGE_FROM_OPENROUTER_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
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

if [[ "${DRY_RUN}" != "true" ]] && ! command -v gh >/dev/null 2>&1; then
  echo "Error: 'gh' CLI is required (or pass --dry-run)." >&2
  exit 1
fi

if [[ "${UPDATE_ALL_LABELS}" == "true" ]]; then
  # OpenRouter (from vault config)
  [[ -z "${FROM_OPENROUTER_VAULT_CONFIG}" ]] && FROM_OPENROUTER_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"
  [[ -z "${JUDGE_FROM_OPENROUTER_VAULT_CONFIG}" ]] && JUDGE_FROM_OPENROUTER_VAULT_CONFIG="x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json"

  # EIS (from discovery artifact)
  [[ -z "${FROM_EIS_MODELS_JSON}" ]] && FROM_EIS_MODELS_JSON="target/eis_models.json"
  [[ -z "${JUDGE_FROM_EIS_MODELS_JSON}" ]] && JUDGE_FROM_EIS_MODELS_JSON="target/eis_models.json"
fi

GH_REPO_ARGS=()
if [[ -n "${REPO}" ]]; then
  GH_REPO_ARGS+=(--repo "${REPO}")
fi

# When --prune is active, track all labels created/updated so we can deprecate stale ones.
CREATED_LABELS_FILE=""
if [[ "${PRUNE}" == "true" && "${DRY_RUN}" != "true" ]]; then
  CREATED_LABELS_FILE="$(mktemp)"
  trap 'rm -f "${CREATED_LABELS_FILE:-}"' EXIT
fi

create_or_update_label() {
  local name="$1"
  local description="$2"
  local color="$3"

  if [[ -z "${name}" || "${name}" == "models:" || "${name}" == "models:eis/" || "${name}" == "models:judge:" ]]; then
    echo "Error: refusing to create an invalid label name: '${name}'" >&2
    exit 1
  fi

  # GitHub label names are limited to 50 characters.
  if [[ "${#name}" -gt 50 ]]; then
    echo "skipped: $name (${#name} chars exceeds GitHub's 50-char limit)" >&2
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    return 0
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "would create/update: $name"
    CREATED_COUNT=$((CREATED_COUNT + 1))
    return 0
  fi

  # Prefer edit-first so we can update labels idempotently without relying on parsing "already exists" errors.
  if gh label edit "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color" >/dev/null 2>&1; then
    echo "updated: $name"
    UPDATED_COUNT=$((UPDATED_COUNT + 1))
    [[ -n "${CREATED_LABELS_FILE:-}" ]] && echo "$name" >> "$CREATED_LABELS_FILE"
    return 0
  fi

  if gh label create "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color" >/dev/null 2>&1; then
    echo "created: $name"
    CREATED_COUNT=$((CREATED_COUNT + 1))
    [[ -n "${CREATED_LABELS_FILE:-}" ]] && echo "$name" >> "$CREATED_LABELS_FILE"
    return 0
  fi

  echo "Warning: failed to create or update label: $name" >&2
  SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
}

HAS_INPUTS="false"
if [[ -n "${FROM_OPENROUTER_CONNECTORS_JSON:-}" ]] || [[ -n "${FROM_OPENROUTER_VAULT_CONFIG:-}" ]] || [[ -n "${FROM_EIS_MODELS_JSON:-}" ]] || [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]] || [[ -n "${JUDGE_FROM_OPENROUTER_VAULT_CONFIG:-}" ]]; then
  HAS_INPUTS="true"
fi
if [[ "${#JUDGE_CONNECTOR_IDS[@]}" -gt 0 ]] || [[ "${#POSITIONAL[@]}" -gt 0 ]]; then
  HAS_INPUTS="true"
fi

if [[ "${HAS_INPUTS}" != "true" && "${PRUNE}" != "true" ]]; then
  usage
  exit 1
fi

# Static group labels — curated model sets that expand to multiple models in eval_pipeline.ts.
# Keep in sync with MODEL_GROUP_ALIASES in .buildkite/pipelines/evals/eval_pipeline.ts.
create_or_update_label "models:weekly-eis-models" "Run evals against the weekly EIS model set (see eval_pipeline.ts)" "$MODELS_COLOR"

generate_openrouter_connectors_json_from_vault_config() {
  local cfg_path="$1"

  if [[ ! -f "${cfg_path}" ]]; then
    echo "Error: missing file: ${cfg_path}" >&2
    exit 1
  fi

  # Read required fields from the config using Node (no jq dependency).
  # Print them as tab-separated values to avoid re-parsing JSON multiple times in bash.
  local openrouter_tsv
  openrouter_tsv="$(
    node - <<'NODE' "${cfg_path}"
const { readFileSync } = require('fs');
const { resolve } = require('path');
const cfgPath = process.argv[2];
const cfg = JSON.parse(readFileSync(resolve(cfgPath), 'utf8'));
const openrouter = cfg && cfg.openrouter ? cfg.openrouter : {};
const baseUrl = openrouter.baseUrl || '';
const apiKey = openrouter.apiKey || '';
process.stdout.write([baseUrl, apiKey].join('\t'));
NODE
  )"

  local base_url api_key
  IFS=$'\t' read -r base_url api_key <<<"${openrouter_tsv}"

  if [[ -z "${base_url}" || -z "${api_key}" ]]; then
    echo "Error: missing openrouter.baseUrl or openrouter.apiKey in ${cfg_path}" >&2
    exit 1
  fi

  # Do not echo the key. Pass it directly to the generator script.
  EVAL_MODEL_GROUPS= node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_openrouter_connectors.js \
    --base-url "${base_url}" \
    --api-key "${api_key}" \
    --format json
}

if [[ -n "${FROM_OPENROUTER_CONNECTORS_JSON:-}" ]]; then
  if [[ ! -f "${FROM_OPENROUTER_CONNECTORS_JSON}" ]]; then
    echo "Error: missing file: ${FROM_OPENROUTER_CONNECTORS_JSON}" >&2
    exit 1
  fi

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  done < <(
    node - <<'NODE' "${FROM_OPENROUTER_CONNECTORS_JSON}"
const fs = require('fs');
const filePath = process.argv[2];
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);
const models = new Set();
for (const connector of Object.values(obj)) {
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m !== 'string' || !m.trim()) continue;
  const id = m.trim();
  models.add(id.startsWith('openrouter/') ? id : 'openrouter/' + id.replaceAll('/', '-'));
}
process.stdout.write([...models].sort().join('\n'));
NODE
  )
fi

if [[ -n "${FROM_OPENROUTER_VAULT_CONFIG:-}" ]]; then
  echo "--- OpenRouter model discovery (${FROM_OPENROUTER_VAULT_CONFIG})" >&2
  openrouter_model_groups="$(
    generate_openrouter_connectors_json_from_vault_config "${FROM_OPENROUTER_VAULT_CONFIG}" | node -e "
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(0, 'utf8'));
const models = new Set();
for (const connector of Object.values(obj)) {
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m !== 'string' || !m.trim()) continue;
  const id = m.trim();
  models.add(id.startsWith('openrouter/') ? id : 'openrouter/' + id.replaceAll('/', '-'));
}
process.stdout.write([...models].sort().join('\\n'));
"
  )"

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  done <<<"${openrouter_model_groups}"
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

if [[ -n "${JUDGE_FROM_OPENROUTER_VAULT_CONFIG:-}" ]]; then
  echo "--- OpenRouter judge discovery (${JUDGE_FROM_OPENROUTER_VAULT_CONFIG})" >&2
  openrouter_connector_ids="$(
    generate_openrouter_connectors_json_from_vault_config "${JUDGE_FROM_OPENROUTER_VAULT_CONFIG}" | node -e "
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(0, 'utf8'));
const models = new Set();
for (const connector of Object.values(obj)) {
  const m = connector && connector.config && connector.config.defaultModel;
  if (typeof m !== 'string' || !m.trim()) continue;
  const id = m.trim();
  models.add(id.startsWith('openrouter/') ? id : 'openrouter/' + id.replaceAll('/', '-'));
}
process.stdout.write([...models].sort().join('\\n'));
"
  )"

  while IFS= read -r connector_id; do
    [[ -z "$connector_id" ]] && continue
    create_or_update_label "models:judge:${connector_id}" "${JUDGE_DESC_PREFIX}${connector_id}" "$JUDGE_COLOR"
  done <<<"${openrouter_connector_ids}"
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

  if [[ "$label" == models:judge:* ]]; then
    judge_connector_id="${label#models:judge:}"
    create_or_update_label "$label" "${JUDGE_DESC_PREFIX}${judge_connector_id}" "$JUDGE_COLOR"
    continue
  else
    model_group="${label#models:}"
    create_or_update_label "$label" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
  fi
done

# --- Deprecation of stale labels ---
DEPRECATED_COLOR="CCCCCC"

if [[ "${PRUNE}" == "true" && "${DRY_RUN}" == "true" ]]; then
  echo ""
  echo "Skipping --prune (requires GitHub label list/edit; omitted in --dry-run)." >&2
elif [[ "${PRUNE}" == "true" && -n "${CREATED_LABELS_FILE:-}" ]]; then
  if [[ ! -s "${CREATED_LABELS_FILE}" ]]; then
    echo ""
    echo "Warning: --prune was set but no labels were created/updated; skipping deprecation to avoid marking all labels stale." >&2
  else
    echo ""
    echo "--- Checking for stale models:* labels to deprecate"

    # Fetch all existing models:* labels from the repo (excluding already-deprecated ones).
    existing_labels="$(gh label list "${GH_REPO_ARGS[@]}" --search "models:" --limit 500 --json name --jq '.[].name' \
      | grep -E '^models:' \
      | sort -u || true)"
    # Also fetch deprecated:models:* labels so we don't re-deprecate them.
    already_deprecated="$(gh label list "${GH_REPO_ARGS[@]}" --search "deprecated:models:" --limit 500 --json name --jq '.[].name' \
      | grep -E '^deprecated:models:' \
      | sed 's/^deprecated://' \
      | sort -u || true)"
    # Exclude labels that already have a deprecated: counterpart.
    if [[ -n "${already_deprecated}" ]]; then
      existing_labels="$(comm -23 <(echo "${existing_labels}") <(echo "${already_deprecated}") || true)"
    fi

    if [[ -z "${existing_labels}" ]]; then
      echo "No existing models:* labels found; nothing to deprecate."
    else
      sorted_created="$(sort -u "${CREATED_LABELS_FILE}")"

      # Set difference: existing minus created/updated = stale
      stale_labels="$(comm -23 <(echo "${existing_labels}") <(echo "${sorted_created}") || true)"

      if [[ -z "${stale_labels}" ]]; then
        echo "No stale labels found."
      else
        while IFS= read -r stale_label; do
          [[ -z "$stale_label" ]] && continue
          deprecated_name="deprecated:${stale_label}"
          if gh label edit "${GH_REPO_ARGS[@]}" "$stale_label" --name "$deprecated_name" --description "DEPRECATED - model no longer available" --color "$DEPRECATED_COLOR" >/dev/null 2>&1; then
            echo "deprecated: $stale_label -> $deprecated_name"
            DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
          else
            echo "Warning: failed to deprecate label: $stale_label" >&2
          fi
        done <<<"${stale_labels}"
      fi
    fi
  fi
fi

# --- Summary ---
echo ""
echo "Summary: created=${CREATED_COUNT} updated=${UPDATED_COUNT} deprecated=${DEPRECATED_COUNT} skipped=${SKIPPED_COUNT}"

