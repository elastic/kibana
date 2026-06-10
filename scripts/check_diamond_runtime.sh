#!/usr/bin/env bash
# check_diamond_runtime.sh — asserts the post-rebuild end-state for the
# diamond pipeline (IntelligenceHub, PR #272912).
#
# Reads creds from env:
#   KIBANA_URL   — e.g. https://kibana-pr-272912-9cd243.kb.us-west2.gcp.elastic-cloud.com
#   ES_URL       — e.g. https://kibana-pr-272912-9cd243.es.us-west2.gcp.elastic-cloud.com
#   KIBANA_AUTH  — user:password  (basic auth for Kibana REST API)
#   ES_AUTH      — user:password  (basic auth for Elasticsearch; defaults to KIBANA_AUTH)
#
# Checks:
#   1. Connector pins  — diamondGateConnector (Haiku) + diamondConnector (Opus) are set and
#                        resolve to real connectors; neither is the .gp-llm-v2 default.
#                        FAIL → runbook Step 1.
#   2. Workflow API key — .kibana_task_manager* task doc for workflow:scheduled tasks have
#                        apiKey fields.  FAIL → runbook Step 2.
#   3. Workflow executed — .workflows-executions* has a status:completed record in the last 5h.
#                        FAIL → runbook Step 2 / wait for next tick.
#   4. (bonus) Jina inference endpoint present; index template is v14+.
#   5. No [ti:connector] WARN lines — catches silent connector degradation (resolveScopedModel
#                        fallback active) in elastic-cloud-logs*. SKIP if log shipping absent.
#
# Exit 0 only if all non-SKIP checks pass.  Each check prints one PASS/FAIL/SKIP line.
# After a fresh ci:cloud-deploy, checks 2 + 3 are expected to fail until
# Step 2 (workflow re-save in the UI) is complete — that proves the check works.

set -euo pipefail

KIBANA_URL="${KIBANA_URL:-}"
ES_URL="${ES_URL:-}"
KIBANA_AUTH="${KIBANA_AUTH:-}"
ES_AUTH="${ES_AUTH:-${KIBANA_AUTH}}"

DIAMOND_GATE_KEY='securitySolution:threatIntelligence:diamondGateConnector'
DIAMOND_KEY='securitySolution:threatIntelligence:diamondConnector'
GP_LLM_DEFAULT='.gp-llm-v2'
# EIS platform connectors — non-UUID IDs = platform-provisioned, survive rebuilds.
# GATE: Anthropic-Claude-Haiku-4-5 (actions connector backed by .anthropic-claude-4.5-haiku-chat_completion inference endpoint)
# DIAMOND: .anthropic-claude-4.7-opus-chat_completion (inference-endpoint-as-connector)
EXPECTED_GATE_CONNECTOR='Anthropic-Claude-Haiku-4-5'
EXPECTED_DIAMOND_CONNECTOR='.anthropic-claude-4.7-opus-chat_completion'
JINA_ENDPOINT='.jina-embeddings-v5-text-small'
INDEX_TEMPLATE_NAME='.kibana-threat-reports-template'
MIN_TEMPLATE_VERSION=14

PASS=0
FAIL=0

# ── helpers ────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 2; }

require_env() {
  [[ -n "${KIBANA_URL}" ]] || die "KIBANA_URL is not set"
  [[ -n "${KIBANA_AUTH}" ]] || die "KIBANA_AUTH is not set (user:password)"
  [[ -n "${ES_URL}" ]]     || die "ES_URL is not set"
}

# GET a Kibana endpoint.  Uses x-elastic-internal-origin so the
# /internal/* endpoints (required on ESS Cloud) accept the request.
kbn() {
  curl -sf --max-time 15 \
    -u "${KIBANA_AUTH}" \
    -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: Kibana' \
    -H 'Content-Type: application/json' \
    "${KIBANA_URL}$1" 2>/dev/null
}

# GET an Elasticsearch endpoint.
es_get() {
  curl -sf --max-time 15 \
    -u "${ES_AUTH}" \
    -H 'Content-Type: application/json' \
    "${ES_URL}$1" 2>/dev/null
}

# POST an Elasticsearch endpoint with a JSON body (passed via stdin / --data-binary @-
# to avoid word-splitting on multi-line bodies).
es_post() {
  local path="$1"
  shift
  echo "$*" | curl -sf --max-time 15 \
    -u "${ES_AUTH}" \
    -H 'Content-Type: application/json' \
    "${ES_URL}${path}" \
    --data-binary @- 2>/dev/null
}

pass() { echo "  PASS: $*"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $*"; FAIL=$((FAIL + 1)); }

# ── check 1: connector pins ────────────────────────────────────────────────

check_connector_pins() {
  echo ""
  echo "CHECK 1 — Connector pins (Kibana API)"

  # /api/kibana/settings returns 400 on ESS Cloud ("not available with current configuration").
  # /internal/kibana/settings works on both local dev and Cloud.
  local settings
  settings=$(kbn '/internal/kibana/settings') || {
    fail "GET /internal/kibana/settings failed — check KIBANA_URL / KIBANA_AUTH"
    return
  }

  local gate_id diamond_id
  gate_id=$(echo "$settings" | python3 -c "
import sys, json
s = json.load(sys.stdin).get('settings', {})
print(s.get('${DIAMOND_GATE_KEY}', {}).get('userValue', '') or '')
" 2>/dev/null)
  diamond_id=$(echo "$settings" | python3 -c "
import sys, json
s = json.load(sys.stdin).get('settings', {})
print(s.get('${DIAMOND_KEY}', {}).get('userValue', '') or '')
" 2>/dev/null)

  if [[ -z "$gate_id" ]]; then
    fail "${DIAMOND_GATE_KEY} is blank → runbook Step 1"
    fail "${DIAMOND_KEY} not checked (gate already blank)"
    return
  fi
  if [[ -z "$diamond_id" ]]; then
    fail "${DIAMOND_KEY} is blank → runbook Step 1"
    return
  fi

  local connectors
  connectors=$(kbn '/api/actions/connectors') || {
    fail "GET /api/actions/connectors failed"
    return
  }

  local gate_ok gate_name diamond_ok diamond_name
  gate_ok=$(echo "$connectors" | python3 -c "
import sys, json
ids = {c['id'] for c in json.load(sys.stdin)}
print('yes' if '${gate_id}' in ids else 'no')
" 2>/dev/null)
  gate_name=$(echo "$connectors" | python3 -c "
import sys, json
cs = {c['id']: c.get('name','?') for c in json.load(sys.stdin)}
print(cs.get('${gate_id}', 'NOT FOUND'))
" 2>/dev/null)

  diamond_ok=$(echo "$connectors" | python3 -c "
import sys, json
ids = {c['id'] for c in json.load(sys.stdin)}
print('yes' if '${diamond_id}' in ids else 'no')
" 2>/dev/null)
  diamond_name=$(echo "$connectors" | python3 -c "
import sys, json
cs = {c['id']: c.get('name','?') for c in json.load(sys.stdin)}
print(cs.get('${diamond_id}', 'NOT FOUND'))
" 2>/dev/null)

  if [[ "$gate_id" == "$GP_LLM_DEFAULT" ]]; then
    fail "Gate is the .gp-llm-v2 default, not Haiku → runbook Step 1"
  elif [[ "$gate_ok" != "yes" ]]; then
    fail "Gate id='${gate_id}' not in /api/actions/connectors → runbook Step 1"
  elif [[ "$gate_id" != "$EXPECTED_GATE_CONNECTOR" ]]; then
    pass "Gate connector: id='${gate_id}' name='${gate_name}' (note: expected '${EXPECTED_GATE_CONNECTOR}')"
  else
    pass "Gate connector: id='${gate_id}' name='${gate_name}'"
  fi

  if [[ "$diamond_id" == "$GP_LLM_DEFAULT" ]]; then
    fail "Diamond is the .gp-llm-v2 default, not Opus → runbook Step 1"
  elif [[ "$diamond_ok" != "yes" ]]; then
    fail "Diamond id='${diamond_id}' not in /api/actions/connectors → runbook Step 1"
  elif [[ "$diamond_id" != "$EXPECTED_DIAMOND_CONNECTOR" ]]; then
    pass "Diamond connector: id='${diamond_id}' name='${diamond_name}' (note: expected '${EXPECTED_DIAMOND_CONNECTOR}')"
  else
    pass "Diamond connector: id='${diamond_id}' name='${diamond_name}'"
  fi
}

# ── check 2: workflow task API key ─────────────────────────────────────────

check_workflow_task_key() {
  echo ""
  echo "CHECK 2 — nl_extraction_behavioral task API key (Elasticsearch)"

  local result
  result=$(es_post '/.kibana_task_manager*/_search?pretty' '{
    "size": 10,
    "query": {
      "bool": {
        "filter": [
          { "term": { "type": "task" } },
          { "term": { "task.taskType": "workflow:scheduled" } },
          { "match": { "task.params": "nl_extraction_behavioral" } }
        ]
      }
    },
    "_source": ["task.apiKey", "task.taskType", "task.enabled", "task.schedule"]
  }') || {
    fail "ES search on .kibana_task_manager* failed — check ES_URL / ES_AUTH"
    return
  }

  local total
  total=$(echo "$result" | python3 -c "
import sys, json
print(json.load(sys.stdin)['hits']['total']['value'])
" 2>/dev/null || echo "0")

  if [[ "$total" == "0" ]]; then
    fail "nl_extraction_behavioral task not found in .kibana_task_manager* → runbook Step 2"
    return
  fi

  local with_key without_key
  with_key=$(echo "$result" | python3 -c "
import sys, json
hits = json.load(sys.stdin)['hits']['hits']
print(sum(1 for h in hits if h['_source'].get('task', {}).get('apiKey')))
" 2>/dev/null || echo "0")
  without_key=$(echo "$result" | python3 -c "
import sys, json
hits = json.load(sys.stdin)['hits']['hits']
print(sum(1 for h in hits if not h['_source'].get('task', {}).get('apiKey')))
" 2>/dev/null || echo "0")

  if [[ "$with_key" -gt 0 && "$without_key" -eq 0 ]]; then
    pass "nl_extraction_behavioral task has apiKey"
  elif [[ "$without_key" -gt 0 && "$with_key" -gt 0 ]]; then
    fail "nl_extraction_behavioral task missing apiKey → re-save workflow in Kibana UI (runbook Step 2)"
  else
    fail "nl_extraction_behavioral task missing apiKey → runbook Step 2 (re-save workflow in Kibana UI)"
  fi
}

# ── check 3: workflow executed recently ────────────────────────────────────

check_workflow_executed() {
  echo ""
  echo "CHECK 3 — Workflow recently executed (Elasticsearch)"

  local cutoff_ms
  cutoff_ms=$(python3 -c "import time; print(int((time.time() - 5*3600) * 1000))")

  # .workflows-executions* uses startedAt/finishedAt, not @timestamp.
  # The compact single-line body avoids multiline quoting issues with es_post.
  local body
  body=$(printf '{"size":5,"sort":[{"startedAt":{"order":"desc"}}],"query":{"bool":{"filter":[{"term":{"status":"completed"}},{"range":{"startedAt":{"gte":%s}}}]}},"_source":["startedAt","finishedAt","status","workflowId"]}' "${cutoff_ms}")

  local result
  result=$(echo "$body" | curl -sf --max-time 15 \
    -u "${ES_AUTH}" \
    -H 'Content-Type: application/json' \
    "${ES_URL}/.workflows-executions*/_search?ignore_unavailable=true&allow_no_indices=true" \
    --data-binary @- 2>/dev/null) || {
    fail "ES search on .workflows-executions* failed — index may not exist yet or auth failed"
    return
  }

  local total
  total=$(echo "$result" | python3 -c "
import sys, json
print(json.load(sys.stdin)['hits']['total']['value'])
" 2>/dev/null || echo "0")

  if [[ "$total" -eq 0 ]]; then
    fail "No status:completed record in .workflows-executions* in the last 5h → runbook Step 2 / wait for next tick"
    return
  fi

  local latest
  latest=$(echo "$result" | python3 -c "
import sys, json
hits = json.load(sys.stdin)['hits']['hits']
if hits:
    h = hits[0]['_source']
    print(h.get('startedAt','?'), h.get('workflowId','?'))
" 2>/dev/null || echo "?")

  pass "${total} completed execution(s) in last 5h — latest: ${latest}"
}

# ── check 4 (bonus): Jina endpoint + template version ─────────────────────

check_infra() {
  echo ""
  echo "CHECK 4 — Jina inference endpoint + index template version (bonus)"

  # /_inference/_all returns { "endpoints": [...] } in ES 8.x+
  local inference_list
  inference_list=$(es_get '/_inference/_all') || { fail "GET /_inference/_all failed"; inference_list='{}'; }

  local jina_found
  jina_found=$(echo "$inference_list" | python3 -c "
import sys, json
d = json.load(sys.stdin)
endpoints = d.get('endpoints', d) if isinstance(d, dict) else d
if isinstance(endpoints, list):
    ids = [ep.get('inference_id','') for ep in endpoints]
    print('yes' if '${JINA_ENDPOINT}' in ids else 'no')
else:
    print('no')
" 2>/dev/null || echo "no")

  if [[ "$jina_found" == "yes" ]]; then
    pass "Jina inference endpoint present: ${JINA_ENDPOINT}"
  else
    fail "Jina inference endpoint '${JINA_ENDPOINT}' not found in /_inference/_all"
  fi

  # Index template version is stored at template._meta.version (not in mappings._meta)
  local tmpl_result
  tmpl_result=$(es_get "/_index_template/${INDEX_TEMPLATE_NAME}") || {
    fail "Index template '${INDEX_TEMPLATE_NAME}' not found"
    return
  }

  local tmpl_version
  tmpl_version=$(echo "$tmpl_result" | python3 -c "
import sys, json
d = json.load(sys.stdin)
tmpls = d.get('index_templates', [])
if tmpls:
    it = tmpls[0].get('index_template', {})
    # version lives at template-level _meta, not in mappings._meta
    meta = it.get('_meta', {})
    print(meta.get('version', 'missing'))
else:
    print('template_not_found')
" 2>/dev/null || echo "error")

  if [[ "$tmpl_version" == "template_not_found" || "$tmpl_version" == "error" || "$tmpl_version" == "missing" ]]; then
    fail "Index template '${INDEX_TEMPLATE_NAME}': _meta.version not found (got: ${tmpl_version})"
  else
    local v
    v=$(echo "$tmpl_version" | tr -d '[:alpha:]')
    if [[ -n "$v" && "$v" -ge "$MIN_TEMPLATE_VERSION" ]]; then
      pass "Index template version: v${tmpl_version} (>= v${MIN_TEMPLATE_VERSION})"
    else
      fail "Index template version: v${tmpl_version} (expected >= v${MIN_TEMPLATE_VERSION})"
    fi
  fi
}

# ── check 5: no [ti:connector] warn lines in recent logs ──────────────────

check_connector_degradation() {
  echo ""
  echo "CHECK 5 — Connector fallback degradation (elastic-cloud-logs*)"

  # elastic-cloud-logs* is the EIS log shipping index that captures Kibana application
  # logs including [ti:connector] WARN lines emitted by resolveScopedModel on fallback.
  # If this index doesn't exist (non-EIS deployment, log shipping disabled), SKIP.
  local cutoff_iso
  cutoff_iso=$(python3 -c "
import datetime
dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=5)
print(dt.strftime('%Y-%m-%dT%H:%M:%SZ'))
")

  local count_result
  count_result=$(printf '{"query":{"bool":{"filter":[{"match":{"message":"[ti:connector]"}},{"term":{"log.level":"WARN"}},{"term":{"service.type":"kibana"}},{"range":{"@timestamp":{"gte":"%s"}}}]}}}' "${cutoff_iso}" | \
    curl -sf --max-time 15 \
      -u "${ES_AUTH}" \
      -H 'Content-Type: application/json' \
      "${ES_URL}/elastic-cloud-logs*/_count?allow_no_indices=true&ignore_unavailable=true" \
      --data-binary @- 2>/dev/null) || {
    echo "  SKIP: elastic-cloud-logs* unreachable or absent — log streaming not configured"
    return
  }

  local warn_count
  warn_count=$(echo "$count_result" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('count', 0))
" 2>/dev/null || echo "unknown")

  if [[ "$warn_count" == "unknown" ]]; then
    echo "  SKIP: could not parse elastic-cloud-logs* count response"
    return
  fi

  if [[ "$warn_count" == "0" ]]; then
    pass "No [ti:connector] WARN lines in elastic-cloud-logs* in the last 5h — no silent degradation"
  else
    # Show the most recent degradation messages
    local samples
    samples=$(printf '{"size":3,"sort":[{"@timestamp":{"order":"desc"}}],"query":{"bool":{"filter":[{"match":{"message":"[ti:connector]"}},{"term":{"log.level":"WARN"}},{"term":{"service.type":"kibana"}},{"range":{"@timestamp":{"gte":"%s"}}}]}},"_source":["@timestamp","message"]}' "${cutoff_iso}" | \
      curl -sf --max-time 15 \
        -u "${ES_AUTH}" \
        -H 'Content-Type: application/json' \
        "${ES_URL}/elastic-cloud-logs*/_search?allow_no_indices=true&ignore_unavailable=true" \
        --data-binary @- 2>/dev/null | python3 -c "
import sys, json
hits = json.load(sys.stdin)['hits']['hits']
for h in hits:
    src = h['_source']
    print('    ', src.get('@timestamp','?'), src.get('message','?')[:100])
" 2>/dev/null || echo "    (could not fetch samples)")
    fail "${warn_count} [ti:connector] WARN line(s) in last 5h — connector fallback is active (silent degradation)"
    echo "$samples"
  fi
}

# ── main ───────────────────────────────────────────────────────────────────

main() {
  require_env

  echo "================================================================"
  echo "Diamond runtime check — ${KIBANA_URL}"
  echo "================================================================"

  check_connector_pins
  check_workflow_task_key
  check_workflow_executed
  check_infra
  check_connector_degradation

  echo ""
  echo "================================================================"
  local total=$(( PASS + FAIL ))
  echo "Result: ${PASS}/${total} checks passed"
  if [[ "$FAIL" -eq 0 ]]; then
    echo "STATUS: ALL PASS — pipeline is healthy"
    exit 0
  else
    echo "STATUS: ${FAIL} FAIL(s) — see remediation hints above"
    exit 1
  fi
}

main "$@"
