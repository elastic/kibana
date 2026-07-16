#!/usr/bin/env bash
#
# Re-runnable setup for the Alerting v2 episode-transition POC (PR #275654).
#
# Creates / replaces the POC rules idempotently (PUT upsert with a fixed id, so
# re-running never duplicates), and can launch kbn-data-forge and run ES|QL
# verification against .rule-events.
#
# Usage:
#   ./setup_rules.sh                 Upsert all POC rules
#   ./setup_rules.sh --data-forge    Upsert rules + launch data-forge in background
#   ./setup_rules.sh --verify        Upsert rules + run verification queries
#   ./setup_rules.sh --clean         Delete all POC rules and exit
#   ./setup_rules.sh --space <id>    Target a non-default space (adds /s/<id>)
#   ./setup_rules.sh --help
#
# Connection: KIBANA_URL is derived from config/kibana.dev.yml (server.port);
# the Elasticsearch host for --data-forge / --verify is derived from
# elasticsearch.hosts. Auth is auto-detected (elastic:changeme) by
# scripts/kibana_api_common.sh. Override with KIBANA_URL / KIBANA_AUTH / ES_URL.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
CONFIG_YML="$REPO_ROOT/config/kibana.dev.yml"
RULES_DIR="$SCRIPT_DIR/rules"

# --- flags -------------------------------------------------------------------
DO_CLEAN=false
DO_DATA_FORGE=false
DO_VERIFY=false
SPACE_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) DO_CLEAN=true; shift ;;
    --data-forge) DO_DATA_FORGE=true; shift ;;
    --verify) DO_VERIFY=true; shift ;;
    --space) SPACE_ID="${2:-}"; shift 2 ;;
    -h|--help)
      # Print only the contiguous header comment block (skip the shebang).
      awk 'NR==1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

SPACE_PREFIX=""
if [[ -n "$SPACE_ID" ]]; then
  SPACE_PREFIX="/s/$SPACE_ID"
fi

# --- derive connection from the worktree's dev config ------------------------
# server.port -> KIBANA_URL (kibana_api_common.sh only probes 5601, so we must
# set it explicitly before sourcing).
if [[ -z "${KIBANA_URL:-}" && -f "$CONFIG_YML" ]]; then
  DEV_PORT="$(grep -E '^[[:space:]]*server\.port:' "$CONFIG_YML" | head -1 | sed -E 's/.*:[[:space:]]*//' | tr -d '[:space:]')"
  if [[ -n "${DEV_PORT:-}" ]]; then
    export KIBANA_URL="http://localhost:$DEV_PORT"
  fi
fi

# elasticsearch.hosts -> ES_URL (first list item under the key).
if [[ -z "${ES_URL:-}" && -f "$CONFIG_YML" ]]; then
  ES_URL="$(awk '
    /^elasticsearch\.hosts:/ { inblock=1; next }
    inblock && /^[[:space:]]*-[[:space:]]*/ { sub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/[[:space:]]/, ""); print; exit }
    inblock && /^[^[:space:]-]/ { inblock=0 }
  ' "$CONFIG_YML")"
fi
ES_URL="${ES_URL:-http://localhost:9203}"

# Auth auto-detection + kibana_curl wrapper.
# shellcheck source=/dev/null
source "$REPO_ROOT/scripts/kibana_api_common.sh"

ES_USER="${KIBANA_AUTH%%:*}"
ES_PASS="${KIBANA_AUTH#*:}"

RULES_API="$KIBANA_URL$SPACE_PREFIX/api/alerting/v2/rules"

echo "Kibana : $KIBANA_URL$SPACE_PREFIX (auth: $ES_USER)"
echo "ES     : $ES_URL"
echo ""

# --- rule ids (derived from filenames) ---------------------------------------
rule_ids() {
  local f
  for f in "$RULES_DIR"/*.json; do
    basename "$f" .json
  done
}

# --- clean -------------------------------------------------------------------
delete_rules() {
  local id status
  echo "Deleting POC rules..."
  for id in $(rule_ids); do
    status="$(kibana_curl -o /dev/null -w '%{http_code}' -X DELETE "$RULES_API/$id")"
    case "$status" in
      204) echo "  [deleted]   $id" ;;
      404) echo "  [not found] $id" ;;
      *)   echo "  [ERROR $status] $id" ;;
    esac
  done
}

if [[ "$DO_CLEAN" == true ]]; then
  delete_rules
  exit 0
fi

# --- upsert ------------------------------------------------------------------
upsert_rules() {
  local file id status tmp
  echo "Upserting POC rules (idempotent PUT)..."
  for file in "$RULES_DIR"/*.json; do
    id="$(basename "$file" .json)"
    tmp="$(mktemp)"
    status="$(kibana_curl -o "$tmp" -w '%{http_code}' -X PUT \
      -H 'Content-Type: application/json' \
      --data-binary "@$file" \
      "$RULES_API/$id")"
    case "$status" in
      200) echo "  [replaced] $id" ;;
      201) echo "  [created]  $id" ;;
      *)
        echo "  [ERROR $status] $id"
        sed -E 's/^/      /' "$tmp"
        echo ;;
    esac
    rm -f "$tmp"
  done
  echo ""
  echo "Rules are enabled on create; give them a few minutes against oscillating"
  echo "data before checking the rule-details activity timeline."
}

upsert_rules

# --- data-forge --------------------------------------------------------------
# Kibana pins a Node version (.node-version); the ambient `node` may differ and
# data_forge.js hard-fails on a mismatch. Prefer the matching nvm-installed node.
resolve_node_bin() {
  local want nvm_node
  if [[ -f "$REPO_ROOT/.node-version" ]]; then
    want="$(tr -d '[:space:]' < "$REPO_ROOT/.node-version")"
    nvm_node="$HOME/.nvm/versions/node/v$want/bin/node"
    if [[ -x "$nvm_node" ]]; then
      echo "$nvm_node"
      return 0
    fi
  fi
  echo "node"
}

run_data_forge() {
  local tmp log node_bin
  node_bin="$(resolve_node_bin)"
  tmp="$(mktemp -t flapping_cpu.XXXXXX)"
  # Inject the detected ES connection (kept out of the committed YAML so it
  # stays portable). When --config is passed, data_forge ignores CLI conn flags,
  # so the connection MUST live in the config file.
  {
    echo "elasticsearch:"
    echo "  host: \"$ES_URL\""
    echo "  username: \"$ES_USER\""
    echo "  password: \"$ES_PASS\""
    echo "  installKibanaUser: false"
    cat "$SCRIPT_DIR/flapping_cpu.yaml"
  } > "$tmp"

  log="$SCRIPT_DIR/data_forge.log"
  echo ""
  echo "Launching kbn-data-forge in the background (streams indefinitely)..."
  echo "  merged config: $tmp"
  echo "  target ES    : $ES_URL"
  echo "  log          : $log"
  echo "  node         : $node_bin"
  nohup "$node_bin" "$REPO_ROOT/x-pack/scripts/data_forge.js" --config "$tmp" >"$log" 2>&1 &
  echo "  PID          : $!"
  echo "  stop with    : kill $!"
}

if [[ "$DO_DATA_FORGE" == true ]]; then
  run_data_forge
fi

# --- verify ------------------------------------------------------------------
# Runs ES|QL against .rule-events for each rule and prints results as tables.
es_query() {
  local q="$1"
  local body
  if command -v jq >/dev/null 2>&1; then
    body="$(jq -Rn --arg q "$q" '{query:$q}')"
  else
    # Minimal fallback JSON encoding (queries only contain " and no newlines here
    # because we pass single-line strings).
    body="{\"query\": \"$(printf '%s' "$q" | sed 's/\\/\\\\/g; s/"/\\"/g')\"}"
  fi
  curl -s -u "$KIBANA_AUTH" -H 'Content-Type: application/json' \
    "$ES_URL/_query?format=txt" -d "$body"
}

verify_rules() {
  local id
  echo ""
  echo "=============================================================="
  echo "Verification (ES|QL against .rule-events)"
  echo "=============================================================="
  for id in $(rule_ids); do
    echo ""
    echo "################## $id ##################"

    echo ""
    echo "-- Episode / run summary --------------------------------------"
    es_query "FROM .rule-events | WHERE type == \"alert\" AND rule.id == \"$id\" | STATS episodes = COUNT_DISTINCT(episode.id), active_runs = COUNT_DISTINCT(episode.status_started_at), events = COUNT(*)"

    echo ""
    echo "-- Transitions (with closed-span duration) --------------------"
    es_query "FROM .rule-events | WHERE rule.id == \"$id\" AND transition.to IS NOT NULL | KEEP @timestamp, group_hash, transition.from, transition.to, transition.ends_status, transition.ends_duration_ms | SORT @timestamp ASC | LIMIT 40"

    echo ""
    echo "-- Flaps (recovering -> active) per series --------------------"
    es_query "FROM .rule-events | WHERE rule.id == \"$id\" AND transition.from == \"recovering\" AND transition.to == \"active\" | STATS flaps = COUNT(*) BY group_hash | SORT flaps DESC"

    echo ""
    echo "-- Phase timeline (mirrors the UI Gantt) ----------------------"
    es_query "FROM .rule-events | WHERE type == \"alert\" AND rule.id == \"$id\" | STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp) BY episode.id, episode.status, episode.status_started_at, group_hash | SORT episode.status_started_at ASC | LIMIT 60"
  done
  echo ""
  echo "Expectations:"
  echo "  poc-flappy-episodes  -> episodes >> 1 (many short lifecycles)"
  echo "  poc-flapping-spans   -> episodes small, active_runs > 1, flaps > 0"
  echo "  poc-recovery-query   -> transitions include ends_status pending/recovering"
}

if [[ "$DO_VERIFY" == true ]]; then
  verify_rules
fi
