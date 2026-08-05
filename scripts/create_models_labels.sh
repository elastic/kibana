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
  --dry-run                             Log every label write that would happen, without calling the GitHub API
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
  --prune                                Mark stale models:* labels as deprecated (renamed to "deprecated:<name>")
  -h, --help                            Show help

Notes:
  - You can pass raw model groups (script will prefix models: automatically).
  - EIS model labels are created as: models:eis/<modelId>
  - Use --prune with discovery flags to deprecate labels for models no longer available.
  - --prune is fail-closed: it is skipped entirely if any label write failed or if no
    discovery source produced labels, because "the write failed" and "the model is gone"
    are otherwise indistinguishable.
  - A label whose model comes back is un-deprecated (renamed back), so PR history is kept
    and a name never exists as both `models:*` and `deprecated:models:*`.
  - Labels whose `deprecated:` form would exceed GitHub's 50-char name limit are deprecated in
    place (description + colour only) instead of being renamed.
EOF
}

MODELS_COLOR="${MODELS_LABEL_COLOR:-505D26}"
JUDGE_COLOR="${MODELS_JUDGE_LABEL_COLOR:-5319E7}"
DESC_PREFIX="${MODELS_LABEL_DESCRIPTION_PREFIX:-Run LLM evals against model: }"
JUDGE_DESC_PREFIX="${MODELS_JUDGE_LABEL_DESCRIPTION_PREFIX:-Override LLM-as-a-judge connector for evals: }"
DEPRECATED_COLOR="CCCCCC"
DEPRECATED_DESCRIPTION="DEPRECATED - model no longer available"

# GitHub label names are limited to 50 characters, descriptions to 100.
MAX_LABEL_NAME_LENGTH=50

# GitHub throttles content-creating requests (secondary rate limit) well below the number of
# writes a full sync would make if it PATCHed every label, so writes are retried with backoff
# and no-op writes are skipped entirely.
GH_MAX_ATTEMPTS="${MODELS_LABEL_GH_MAX_ATTEMPTS:-4}"
GH_RETRY_DELAY_SECONDS="${MODELS_LABEL_GH_RETRY_DELAY_SECONDS:-5}"
GH_MAX_CONSECUTIVE_FAILURES="${MODELS_LABEL_GH_MAX_CONSECUTIVE_FAILURES:-5}"
LABEL_FETCH_LIMIT="${MODELS_LABEL_FETCH_LIMIT:-1000}"

REPO=""
FROM_LITELLM_CONNECTORS_JSON=""
FROM_LITELLM_VAULT_CONFIG=""
FROM_EIS_MODELS_JSON=""
JUDGE_FROM_EIS_MODELS_JSON=""
JUDGE_FROM_LITELLM_VAULT_CONFIG=""
UPDATE_ALL_LABELS="false"
PRUNE="false"
DRY_RUN="false"
declare -a JUDGE_CONNECTOR_IDS=()
declare -a POSITIONAL=()

# Counters for summary reporting
CREATED_COUNT=0
UPDATED_COUNT=0
UNCHANGED_COUNT=0
RESTORED_COUNT=0
DEPRECATED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

# Labels that came from a discovery source (LiteLLM/EIS) rather than from a static or
# hand-passed name. --prune is only meaningful when this is non-zero.
DISCOVERED_LABEL_COUNT=0

# Namespaces a discovery source actually reported on this run. --prune only deprecates labels
# inside these, so running with one source can never deprecate the other source's labels.
declare -a PRUNE_SCOPES=()

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

# Snapshot of the repo's `models:*` / `deprecated:models:*` labels as `name<TAB>color<TAB>description`,
# kept in sync with every write so the run never has to re-read the API to decide what to do.
LABEL_CACHE_FILE="$(mktemp)"
# Every label this run wants to exist, whether or not a write was needed. --prune deprecates
# `models:*` labels that are absent from this list.
DESIRED_LABELS_FILE="$(mktemp)"
trap 'rm -f "${LABEL_CACHE_FILE}" "${DESIRED_LABELS_FILE}"' EXIT

load_label_cache() {
  if ! gh label list "${GH_REPO_ARGS[@]}" --search "models:" --limit "${LABEL_FETCH_LIMIT}" \
    --json name,color,description --jq '.[] | [.name, .color, (.description // "")] | @tsv' \
    > "${LABEL_CACHE_FILE}"; then
    echo "Error: failed to list existing labels." >&2
    exit 1
  fi

  local count
  count="$(wc -l < "${LABEL_CACHE_FILE}" | tr -d '[:space:]')"

  # A truncated listing would make existing labels look absent, so refuse rather than guess.
  if [[ "${count}" -ge "${LABEL_FETCH_LIMIT}" ]]; then
    echo "Error: label listing hit the ${LABEL_FETCH_LIMIT} result limit; raise MODELS_LABEL_FETCH_LIMIT." >&2
    exit 1
  fi

  echo "Loaded ${count} existing models:* labels"
}

label_exists() {
  awk -F'\t' -v needle="$1" '$1 == needle { found = 1; exit } END { exit found ? 0 : 1 }' "${LABEL_CACHE_FILE}"
}

# Prints `color<TAB>description` for an existing label.
lookup_label() {
  awk -F'\t' -v needle="$1" '$1 == needle { printf "%s\t%s", $2, $3; exit }' "${LABEL_CACHE_FILE}"
}

cache_remove() {
  local tmp
  tmp="$(mktemp)"
  awk -F'\t' -v needle="$1" '$1 != needle' "${LABEL_CACHE_FILE}" > "${tmp}"
  mv "${tmp}" "${LABEL_CACHE_FILE}"
}

cache_upsert() {
  cache_remove "$1"
  printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "${LABEL_CACHE_FILE}"
}

# Runs `gh label <args>` with exponential backoff. The expected failure mode is GitHub's
# secondary rate limit on content-creating requests, which clears on its own.
GH_LAST_ERROR=""
CONSECUTIVE_WRITE_FAILURES=0
gh_label_write() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "  [dry-run] gh label $*"
    return 0
  fi

  local max_attempts="${GH_MAX_ATTEMPTS}"

  # Failing this consistently means something is broken rather than throttled, so stop paying for
  # backoff on every remaining label. --prune is fail-closed, so the run still can't do damage.
  if [[ "${CONSECUTIVE_WRITE_FAILURES}" -ge "${GH_MAX_CONSECUTIVE_FAILURES}" ]]; then
    max_attempts=1
  fi

  local attempt=1
  local delay="${GH_RETRY_DELAY_SECONDS}"

  while true; do
    if GH_LAST_ERROR="$(gh label "$@" 2>&1)"; then
      CONSECUTIVE_WRITE_FAILURES=0
      return 0
    fi

    if [[ "${attempt}" -ge "${max_attempts}" ]]; then
      CONSECUTIVE_WRITE_FAILURES=$((CONSECUTIVE_WRITE_FAILURES + 1))
      if [[ "${CONSECUTIVE_WRITE_FAILURES}" -eq "${GH_MAX_CONSECUTIVE_FAILURES}" ]]; then
        echo "  ${CONSECUTIVE_WRITE_FAILURES} consecutive write failures; disabling retries for the rest of this run" >&2
      fi
      return 1
    fi

    echo "  retrying in ${delay}s (attempt ${attempt}/${GH_MAX_ATTEMPTS}): ${GH_LAST_ERROR//$'\n'/ }" >&2
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

record_failure() {
  echo "Warning: $1" >&2
  FAILED_COUNT=$((FAILED_COUNT + 1))
}

create_or_update_label() {
  local name="$1"
  local description="$2"
  local color="$3"

  if [[ -z "${name}" || "${name}" == "models:" || "${name}" == "models:eis/" || "${name}" == "models:judge:" ]]; then
    echo "Error: refusing to create an invalid label name: '${name}'" >&2
    exit 1
  fi

  # Safe to leave out of the desired set: a name this long can never have been created either,
  # so --prune will not find it among the existing labels.
  if [[ "${#name}" -gt "${MAX_LABEL_NAME_LENGTH}" ]]; then
    echo "skipped: $name (${#name} chars exceeds GitHub's ${MAX_LABEL_NAME_LENGTH}-char limit)" >&2
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    return 0
  fi

  echo "$name" >> "${DESIRED_LABELS_FILE}"

  if label_exists "$name"; then
    local existing_color existing_description
    IFS=$'\t' read -r existing_color existing_description <<<"$(lookup_label "$name")"

    if [[ "${existing_color}" == "${color}" && "${existing_description}" == "${description}" ]]; then
      UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
      return 0
    fi

    if gh_label_write edit "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color"; then
      echo "updated: $name"
      UPDATED_COUNT=$((UPDATED_COUNT + 1))
      cache_upsert "$name" "$color" "$description"
      return 0
    fi

    record_failure "failed to update label: $name (${GH_LAST_ERROR})"
    return 0
  fi

  # The model is back after a previous prune: rename the deprecated label instead of creating a
  # new one, so PRs keep the label and the name never exists in both forms.
  local deprecated_name="deprecated:${name}"
  if label_exists "${deprecated_name}"; then
    if gh_label_write edit "${GH_REPO_ARGS[@]}" "${deprecated_name}" --name "$name" --description "$description" --color "$color"; then
      echo "restored: ${deprecated_name} -> ${name}"
      RESTORED_COUNT=$((RESTORED_COUNT + 1))
      cache_remove "${deprecated_name}"
      cache_upsert "$name" "$color" "$description"
      return 0
    fi

    record_failure "failed to restore label: ${deprecated_name} -> ${name} (${GH_LAST_ERROR})"
    return 0
  fi

  if gh_label_write create "${GH_REPO_ARGS[@]}" "$name" --description "$description" --color "$color"; then
    echo "created: $name"
    CREATED_COUNT=$((CREATED_COUNT + 1))
    cache_upsert "$name" "$color" "$description"
    return 0
  fi

  record_failure "failed to create label: $name (${GH_LAST_ERROR})"
}

# Which discovery source owns a label name.
label_scope() {
  case "$1" in
    models:judge:eis/*) echo "judge-eis" ;;
    models:judge:*) echo "judge-litellm" ;;
    models:eis/*) echo "eis" ;;
    *) echo "litellm" ;;
  esac
}

scope_is_pruneable() {
  local scope="$1"
  local enabled
  for enabled in "${PRUNE_SCOPES[@]+"${PRUNE_SCOPES[@]}"}"; do
    [[ "${enabled}" == "${scope}" ]] && return 0
  done
  return 1
}

# Fails the run when a discovery source comes back empty: an empty source would otherwise look
# like "every model from this source is gone" and prune the whole set.
require_non_empty_source() {
  local source_name="$1"
  local values="$2"

  if [[ -z "${values//[[:space:]]/}" ]]; then
    echo "Error: ${source_name} returned no models; refusing to continue." >&2
    exit 1
  fi
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

load_label_cache

# Static group labels — curated model sets that expand to multiple models in eval_pipeline.ts.
# Keep in sync with MODEL_GROUP_ALIASES in .buildkite/pipelines/evals/eval_pipeline.ts.
create_or_update_label "models:weekly-eis-models" "Run evals against the weekly EIS model set (see eval_pipeline.ts)" "$MODELS_COLOR"

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
const { readFileSync } = require('fs');
const { resolve } = require('path');
const cfgPath = process.argv[2];
const cfg = JSON.parse(readFileSync(resolve(cfgPath), 'utf8'));
const litellm = cfg && cfg.litellm ? cfg.litellm : {};
const baseUrl = litellm.baseUrl || '';
const teamId = litellm.teamId || '';
const virtualKey = litellm.virtualKey || '';
process.stdout.write([baseUrl, teamId, virtualKey].join('\t'));
NODE
  )"

  local base_url team_id virtual_key
  IFS=$'\t' read -r base_url team_id virtual_key <<<"${litellm_tsv}"

  if [[ -z "${base_url}" || -z "${virtual_key}" ]]; then
    echo "Error: missing litellm.baseUrl or litellm.virtualKey in ${cfg_path}" >&2
    exit 1
  fi

  # Do not echo the key. Pass it directly to the generator script.
  local team_args=()
  if [[ -n "${team_id}" ]]; then
    team_args+=(--team-id "${team_id}")
  fi

  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_litellm_connectors.js \
    --base-url "${base_url}" \
    "${team_args[@]}" \
    --api-key "${virtual_key}" \
    --format json
}

if [[ -n "${FROM_LITELLM_CONNECTORS_JSON:-}" ]]; then
  if [[ ! -f "${FROM_LITELLM_CONNECTORS_JSON}" ]]; then
    echo "Error: missing file: ${FROM_LITELLM_CONNECTORS_JSON}" >&2
    exit 1
  fi

  litellm_model_groups="$(
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
  )"

  require_non_empty_source "LiteLLM connectors JSON (${FROM_LITELLM_CONNECTORS_JSON})" "${litellm_model_groups}"
  PRUNE_SCOPES+=("litellm")

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
    DISCOVERED_LABEL_COUNT=$((DISCOVERED_LABEL_COUNT + 1))
  done <<<"${litellm_model_groups}"
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

  require_non_empty_source "LiteLLM model discovery" "${litellm_model_groups}"
  PRUNE_SCOPES+=("litellm")

  while IFS= read -r model_group; do
    [[ -z "$model_group" ]] && continue
    create_or_update_label "models:${model_group}" "${DESC_PREFIX}${model_group}" "$MODELS_COLOR"
    DISCOVERED_LABEL_COUNT=$((DISCOVERED_LABEL_COUNT + 1))
  done <<<"${litellm_model_groups}"
fi

if [[ -n "${FROM_EIS_MODELS_JSON:-}" ]]; then
  if [[ ! -f "${FROM_EIS_MODELS_JSON}" ]]; then
    echo "Error: missing file: ${FROM_EIS_MODELS_JSON}" >&2
    exit 1
  fi

  eis_model_ids="$(
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
  )"

  require_non_empty_source "EIS model discovery (${FROM_EIS_MODELS_JSON})" "${eis_model_ids}"
  PRUNE_SCOPES+=("eis")

  while IFS= read -r model_id; do
    [[ -z "$model_id" ]] && continue
    create_or_update_label "models:eis/${model_id}" "${DESC_PREFIX}eis/${model_id}" "$MODELS_COLOR"
    DISCOVERED_LABEL_COUNT=$((DISCOVERED_LABEL_COUNT + 1))
  done <<<"${eis_model_ids}"
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

  require_non_empty_source "LiteLLM judge discovery" "${litellm_connector_ids}"
  PRUNE_SCOPES+=("judge-litellm")

  while IFS= read -r connector_id; do
    [[ -z "$connector_id" ]] && continue
    create_or_update_label "models:judge:${connector_id}" "${JUDGE_DESC_PREFIX}${connector_id}" "$JUDGE_COLOR"
    DISCOVERED_LABEL_COUNT=$((DISCOVERED_LABEL_COUNT + 1))
  done <<<"${litellm_connector_ids}"
fi

if [[ -n "${JUDGE_FROM_EIS_MODELS_JSON:-}" ]]; then
  if [[ ! -f "${JUDGE_FROM_EIS_MODELS_JSON}" ]]; then
    echo "Error: missing file: ${JUDGE_FROM_EIS_MODELS_JSON}" >&2
    exit 1
  fi

  judge_eis_model_ids="$(
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
  )"

  require_non_empty_source "EIS judge discovery (${JUDGE_FROM_EIS_MODELS_JSON})" "${judge_eis_model_ids}"
  PRUNE_SCOPES+=("judge-eis")

  while IFS= read -r model_id; do
    [[ -z "$model_id" ]] && continue
    create_or_update_label "models:judge:eis/${model_id}" "${JUDGE_DESC_PREFIX}eis/${model_id}" "$JUDGE_COLOR"
    DISCOVERED_LABEL_COUNT=$((DISCOVERED_LABEL_COUNT + 1))
  done <<<"${judge_eis_model_ids}"
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

print_summary() {
  echo ""
  echo "Summary: created=${CREATED_COUNT} updated=${UPDATED_COUNT} unchanged=${UNCHANGED_COUNT} restored=${RESTORED_COUNT} deprecated=${DEPRECATED_COUNT} skipped=${SKIPPED_COUNT} failed=${FAILED_COUNT}"
}

# Fallback for labels whose `deprecated:` form would exceed GitHub's name limit — most
# `models:judge:*` names do. The label keeps its name (so it stays in autocomplete) but carries
# the deprecated description and colour, which is better than silently staying active.
deprecate_in_place() {
  local name="$1"
  local existing_color existing_description
  IFS=$'\t' read -r existing_color existing_description <<<"$(lookup_label "$name")"

  if [[ "${existing_color}" == "${DEPRECATED_COLOR}" && "${existing_description}" == "${DEPRECATED_DESCRIPTION}" ]]; then
    UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
    return 0
  fi

  if gh_label_write edit "${GH_REPO_ARGS[@]}" "$name" --description "${DEPRECATED_DESCRIPTION}" --color "${DEPRECATED_COLOR}"; then
    echo "deprecated in place: $name (deprecated:${name} would exceed ${MAX_LABEL_NAME_LENGTH} chars)"
    DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
    cache_upsert "$name" "${DEPRECATED_COLOR}" "${DEPRECATED_DESCRIPTION}"
    return 0
  fi

  echo "Warning: failed to deprecate label in place: $name (${GH_LAST_ERROR})" >&2
  FAILED_COUNT=$((FAILED_COUNT + 1))
}

# --- Deprecation of stale labels ---
if [[ "${PRUNE}" == "true" ]]; then
  echo ""

  # Deprecation is fail-closed: a label that could not be written is indistinguishable from a
  # model that no longer exists, and deprecating it would take the label away from a live model.
  if [[ "${FAILED_COUNT}" -gt 0 ]]; then
    echo "Error: ${FAILED_COUNT} label write(s) failed; skipping deprecation." >&2
    echo "Re-run once the failures above are resolved so stale labels can be deprecated." >&2
    print_summary
    exit 1
  fi

  if [[ "${DISCOVERED_LABEL_COUNT}" -eq 0 ]]; then
    echo "Error: --prune requires at least one discovery source; skipping deprecation." >&2
    print_summary
    exit 1
  fi

  echo "--- Checking for stale models:* labels to deprecate (scopes: ${PRUNE_SCOPES[*]})"

  existing_labels="$(awk -F'\t' '$1 ~ /^models:/ { print $1 }' "${LABEL_CACHE_FILE}" | sort -u)"
  desired_labels="$(sort -u "${DESIRED_LABELS_FILE}")"

  # Set difference: existing minus desired, limited to namespaces a source reported on.
  stale_labels=""
  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue
    scope_is_pruneable "$(label_scope "${candidate}")" || continue
    stale_labels+="${candidate}"$'\n'
  done < <(comm -23 <(echo "${existing_labels}") <(echo "${desired_labels}"))

  if [[ -z "${stale_labels//[[:space:]]/}" ]]; then
    echo "No stale labels found."
  else
    while IFS= read -r stale_label; do
      [[ -z "$stale_label" ]] && continue
      deprecated_name="deprecated:${stale_label}"

      # Legacy state: the name exists in both forms, which predates un-deprecation on restore.
      # Renaming would collide, so leave it for a human to merge.
      if label_exists "${deprecated_name}"; then
        echo "Warning: cannot deprecate ${stale_label}: ${deprecated_name} already exists; delete one of them manually." >&2
        continue
      fi

      if [[ "${#deprecated_name}" -gt "${MAX_LABEL_NAME_LENGTH}" ]]; then
        deprecate_in_place "$stale_label"
        continue
      fi

      if gh_label_write edit "${GH_REPO_ARGS[@]}" "$stale_label" --name "$deprecated_name" --description "${DEPRECATED_DESCRIPTION}" --color "$DEPRECATED_COLOR"; then
        echo "deprecated: $stale_label -> $deprecated_name"
        DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
        cache_remove "$stale_label"
        cache_upsert "$deprecated_name" "$DEPRECATED_COLOR" "${DEPRECATED_DESCRIPTION}"
      else
        echo "Warning: failed to deprecate label: $stale_label (${GH_LAST_ERROR})" >&2
        FAILED_COUNT=$((FAILED_COUNT + 1))
      fi
    done <<<"${stale_labels}"
  fi
fi

print_summary

if [[ "${FAILED_COUNT}" -gt 0 ]]; then
  exit 1
fi

