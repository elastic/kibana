#!/usr/bin/env bash
# Seed a Discovery -> Investigation -> Incident showcase via Kibana APIs.
#
# Reproduces the full observability SRE flow deterministically (no LLM/workflow
# dependency) by calling the same internal routes the managed investigation
# workflow uses:
#   1. Discovery : a Streams significant event is created
#   2. Investigation: an investigation group conversation is created + linked to the event
#   3. Incident  : an incident group conversation is created + linked to the investigation
#   4. Timeline  : lifecycle entries are appended to the investigation (owns the timeline)
#
# Runs entirely as the auto-detected Kibana user (no accounts are created).
#
# Usage: ./scripts/seed_investigation_incident_demo.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=/dev/null
source "$REPO_ROOT/scripts/kibana_api_common.sh"

SIG="${KIBANA_URL}/internal/significant_events"
SIGEV="${KIBANA_URL}/internal/sig_events"
OBS="${KIBANA_URL}/internal/observability_agent_builder"
API="${KIBANA_URL}/api/agent_builder"

STREAM="logs.otel"
SERVICE="payment-service"

DISCOVERY_SLUG="demo-checkout-latency-$(date +%s)"
EVENT_ID="${DISCOVERY_SLUG}-evt"
WF_EXEC_ID="demo-exec-$(date +%s)"
NOW_OFF="$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")"
TMP="$(mktemp)"

kb() {
  # kb METHOD URL_BASE PATH  [extra curl args...]
  local method="$1" base="$2" path="$3"
  curl -sS -k -u "$KIBANA_AUTH" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: Kibana" \
    -H "Content-Type: application/json" \
    -X "$method" "${base}${path}" "${@:4}"
}

note() {
  # note CONVERSATION_ID MESSAGE
  kb POST "$API" "/conversations/$1/messages" -d "$(python3 -c "import json,sys;print(json.dumps({'message':sys.argv[1]}))" "$2")" >/dev/null || true
}

INVESTIGATION_AGENT_ID="platform.streams.investigation"
INVESTIGATION_CONNECTOR_ID=".anthropic-claude-4.6-sonnet-chat_completion"

run_investigation_agent() {
  # run_investigation_agent CONVERSATION_ID
  # Runs the investigation agent inside the group conversation so its full reasoning +
  # tool-call trace is visible inline. Group conversations only invoke the agent when the
  # message mentions @agent, so we prefix it (same as the managed workflow's ai.agent step).
  local conversation_id="$1"
  local body
  body="$(python3 - "$conversation_id" "$INVESTIGATION_AGENT_ID" "$INVESTIGATION_CONNECTOR_ID" "$SERVICE" "$STREAM" <<'PY'
import json, sys
conversation_id, agent_id, connector_id, service, stream = sys.argv[1:6]
print(json.dumps({
  "agent_id": agent_id,
  "conversation_id": conversation_id,
  "connector_id": connector_id,
  "input": (
    "@agent Investigate the root cause of the following issue:\n\n"
    f"Checkout p99 latency spike on {service}\n\n"
    f"p99 latency on {service} rose from 180ms to 3.4s starting ~10:05 UTC, checkout "
    "error rate ~6% with a surge of upstream 504s, correlated with the 10:02 deploy of "
    f"{service} v2.31.0.\n\n"
    f"Data streams (use get_index_info to discover available fields): {stream}"
  ),
}))
PY
)"
  curl -sS -N -k -u "$KIBANA_AUTH" \
    -H "kbn-xsrf: true" -H "x-elastic-internal-origin: Kibana" -H "Content-Type: application/json" \
    --max-time 600 -X POST "$API/converse" -d "$body" -o /dev/null || true
}

echo "== Discovery -> Investigation -> Incident demo seed =="
echo "Kibana: $KIBANA_URL"
echo

# ---------------------------------------------------------------------------
# 1. DISCOVERY: create a significant event
# ---------------------------------------------------------------------------
echo "[1/6] Creating significant event (discovery) $EVENT_ID ..."
kb POST "$SIG" "/events" -d "$(python3 - <<PY
import json
print(json.dumps([{
  "@timestamp": "$NOW_OFF",
  "created_at": "$NOW_OFF",
  "event_id": "$EVENT_ID",
  "discovery_slug": "$DISCOVERY_SLUG",
  "status": "promoted",
  "stream_names": ["$STREAM"],
  "title": "Checkout p99 latency spike on $SERVICE",
  "summary": "p99 latency on $SERVICE rose from 180ms to 3.4s starting ~10:05 UTC. Checkout error rate climbed to 6% with a surge of upstream 504s. Onset correlates with the 10:02 deploy of $SERVICE v2.31.0.",
  "root_cause": "Redis connection pool saturation: v2.31.0 lowered the pool max from 200 to 20, so requests queue for connections under peak checkout load.",
  "criticality": 0.85,
  "confidence": 0.78,
  "recommendations": [
    "Roll back $SERVICE to v2.30.4 or raise redis.pool.max back to 200",
    "Add an alert on redis_pool_wait_seconds p95 > 250ms",
    "Add a canary gate on checkout p99 before promoting deploys"
  ]
}]))
PY
)" >"$TMP"
if grep -q '"errors":true\|statusCode' "$TMP"; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  event created on stream '$STREAM'"

# ---------------------------------------------------------------------------
# 2. INVESTIGATION: create the investigation group conversation
#    (mirrors POST .../investigation_conversations/from_workflow used by the workflow)
# ---------------------------------------------------------------------------
echo "[2/6] Creating investigation conversation ..."
kb POST "$OBS" "/investigation_conversations/from_workflow" -d "$(python3 - <<PY
import json
print(json.dumps({
  "title": "Investigation: Checkout p99 latency spike on $SERVICE",
  "serviceName": "$SERVICE",
  "workflowExecutionId": "$WF_EXEC_ID",
  "workflowId": "system-streams-investigation",
  "connectorId": ".anthropic-claude-4.6-sonnet-chat_completion",
  "severity": "high",
  "status": "complete",
  "report": "Root cause: $SERVICE v2.31.0 shipped a config change lowering redis.pool.max from 200 to 20. Under peak checkout load requests block waiting for a Redis connection (redis_pool_wait_seconds p95 ~1.9s), inflating checkout p99 to 3.4s and driving upstream 504s.",
  "currentState": "Root cause identified. Awaiting rollback/config fix. Customer-facing checkout still degraded (~6% errors).",
  "initialContext": "Triggered from significant event on $STREAM. Onset 10:05 UTC, correlated with 10:02 deploy of $SERVICE v2.31.0.",
  "metadata": {
    "event_id": "$EVENT_ID",
    "discovery_slug": "$DISCOVERY_SLUG",
    "stream_names": ["$STREAM"]
  }
}))
PY
)" >"$TMP"
INV_CONV_ID="$(python3 -c "import json; print(json.load(open('$TMP'))['conversation']['id'])" 2>/dev/null || true)"
if [[ -z "$INV_CONV_ID" ]]; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  investigation conversation: $INV_CONV_ID"

# Run the investigation agent inside the group conversation so its full reasoning +
# tool-call trace shows up inline (mirrors the managed workflow's ai.agent step).
echo "      running investigation agent in the conversation (live LLM, ~1-2 min) ..."
run_investigation_agent "$INV_CONV_ID"
echo "      agent trace added"

# ---------------------------------------------------------------------------
# 3. Link the investigation back onto the significant event (Streams flyout)
#    (mirrors POST /internal/sig_events/events/{id}/investigations)
# ---------------------------------------------------------------------------
echo "[3/6] Attaching investigation to the significant event ..."
kb POST "$SIGEV" "/events/$EVENT_ID/investigations" -d "$(python3 - <<PY
import json
print(json.dumps({
  "workflow_execution_id": "$WF_EXEC_ID",
  "status": "success",
  "started_at": "$NOW_OFF",
  "completed_at": "$NOW_OFF",
  "conversation_id": "$INV_CONV_ID",
  "outcome": "Redis connection pool saturation after v2.31.0 lowered pool max 200 -> 20",
  "current_state": "Root cause identified. Awaiting rollback/config fix."
}))
PY
)" >"$TMP"
if grep -q 'statusCode' "$TMP"; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  investigation linked to event"

echo "      adding collaborator notes to the investigation ..."
note "$INV_CONV_ID" "Confirmed redis_pool_wait_seconds p95 ~1.9s across all checkout pods. This is the deploy."
note "$INV_CONV_ID" "This is customer-facing. Escalating to an incident and paging the on-call for payment-service."

# ---------------------------------------------------------------------------
# 4. INCIDENT: create an incident group conversation from the investigation
#    (mirrors POST .../investigation_conversations/{id}/incident)
# ---------------------------------------------------------------------------
echo "[4/6] Creating incident conversation from investigation ..."
kb POST "$OBS" "/investigation_conversations/$INV_CONV_ID/incident" >"$TMP"
INC_CONV_ID="$(python3 -c "import json; print(json.load(open('$TMP'))['incidentConversation']['id'])" 2>/dev/null || true)"
if [[ -z "$INC_CONV_ID" ]]; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  incident conversation: $INC_CONV_ID"

echo "      adding incident coordination notes ..."
note "$INC_CONV_ID" "Incident declared, SEV-2. Rolling back payment-service to v2.30.4 now."
note "$INC_CONV_ID" "Rollback deploying. Watching checkout p99 and error rate for recovery."

# ---------------------------------------------------------------------------
# 5. TIMELINE: append lifecycle entries via investigation refresh
#    The refresh route appends these entries to the linked *incident*
#    conversation's custom_fields.timeline, which is what the incident's
#    Timeline tab renders.
# ---------------------------------------------------------------------------
echo "[5/6] Appending incident timeline entries ..."
kb POST "$OBS" "/investigation_conversations/$INV_CONV_ID/refresh" -d '{
  "status": "in progress",
  "currentState": "Rollback to v2.30.4 in progress. Checkout p99 starting to recover.",
  "outcome": "Mitigation: rollback of payment-service v2.31.0 underway.",
  "timeline": [
    {"actor": "analyst_a", "source": "incident", "summary": "SEV-2 declared; rollback of payment-service to v2.30.4 started"}
  ]
}' >"$TMP"
if grep -q 'statusCode' "$TMP"; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi

kb POST "$OBS" "/investigation_conversations/$INV_CONV_ID/refresh" -d '{
  "status": "resolved",
  "currentState": "Checkout p99 back to ~185ms, error rate <0.5%. Incident resolved.",
  "outcome": "Resolved by rolling back payment-service to v2.30.4. Permanent fix: restore redis.pool.max=200 and add canary gate.",
  "timeline": [
    {"actor": "analyst_b", "source": "incident", "summary": "Rollback complete; checkout p99 recovered to ~185ms, error rate <0.5%"},
    {"actor": "incident lifecycle", "source": "incident", "summary": "Incident resolved"}
  ]
}' >"$TMP"
if grep -q 'statusCode' "$TMP"; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  timeline updated (mitigation -> recovery -> resolved)"

# ---------------------------------------------------------------------------
# 6. Close the incident (status -> resolved), preserving its timeline.
#    PATCH replaces custom_fields, so read-merge-write to keep the timeline.
# ---------------------------------------------------------------------------
echo "[6/7] Closing the incident (status -> resolved) ..."
kb GET "$API" "/conversations/$INC_CONV_ID" >"$TMP"
CLOSE_BODY="$(python3 - "$TMP" <<'PY'
import json, sys
c = json.load(open(sys.argv[1]))
cf = dict(c.get("custom_fields") or {})
cf["status"] = "resolved"
print(json.dumps({"custom_fields": cf}))
PY
)"
kb PATCH "${KIBANA_URL}/internal/agent_builder" "/conversations/$INC_CONV_ID" -d "$CLOSE_BODY" >"$TMP"
if grep -q 'statusCode' "$TMP"; then echo "  ERROR:"; python3 -m json.tool "$TMP"; exit 1; fi
echo "  incident resolved"

# ---------------------------------------------------------------------------
# 7. Done
# ---------------------------------------------------------------------------
echo "[7/7] Done."
rm -f "$TMP"
echo
echo "Showcase entry points:"
echo "  Significant event (discovery):"
echo "    Streams app -> Significant events -> \"Checkout p99 latency spike on $SERVICE\""
echo "    (event_id: $EVENT_ID)"
echo "  Investigation conversation:"
echo "    ${KIBANA_URL}/app/agent_builder/conversations/${INV_CONV_ID}"
echo "  Incident conversation:"
echo "    ${KIBANA_URL}/app/agent_builder/conversations/${INC_CONV_ID}"
echo
echo "The incident conversation's Timeline tab shows the incident lifecycle."
