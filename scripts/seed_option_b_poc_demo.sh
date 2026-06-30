#!/usr/bin/env bash
# Seed Option B POC demo data via Kibana APIs.
#
# Usage: ./scripts/seed_option_b_poc_demo.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=/dev/null
source "$REPO_ROOT/scripts/kibana_api_common.sh"

ES_URL="${ES_URL:-http://localhost:9200}"
ES_AUTH="${ES_AUTH:-$KIBANA_AUTH}"
API="${KIBANA_URL}/api/agent_builder"
INTERNAL="${KIBANA_URL}/internal/agent_builder"
DEMO_PASSWORD="changeme"

es_curl() {
  curl -sS -k -u "$ES_AUTH" -H "Content-Type: application/json" "$@"
}

kibana_as() {
  local user="$1"
  shift
  curl -sS -k -u "${user}:${DEMO_PASSWORD}" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: Kibana" \
    -H "Content-Type: application/json" \
    "$@"
}

ensure_user() {
  local username="$1"
  local full_name="$2"
  local status
  status="$(es_curl -o /dev/null -w "%{http_code}" "$ES_URL/_security/user/$username")"
  if [[ "$status" == "200" ]]; then
    echo "  user $username already exists"
    return
  fi
  es_curl -X POST "$ES_URL/_security/user/$username" -d "{
    \"password\": \"$DEMO_PASSWORD\",
    \"roles\": [\"superuser\"],
    \"full_name\": \"$full_name\",
    \"email\": \"${username}@example.com\"
  }" >/dev/null
  echo "  created user $username (password: $DEMO_PASSWORD)"
}

require_ok() {
  local label="$1"
  local file="$2"
  if python3 -c "import json,sys; r=json.load(open('$file')); sys.exit(0 if r.get('statusCode') is None else 1)"; then
    return 0
  fi
  echo "ERROR: $label failed:" >&2
  python3 -m json.tool "$file" >&2
  exit 1
}

delete_all_demo_conversations() {
  echo "Removing existing demo conversations..."
  local user deleted=0

  python3 - "$API" "$TMP" analyst_a analyst_b <<'PY'
import json
import subprocess
import sys

api_base, tmp_path, *users = sys.argv[1:]
password = "changeme"
seen = set()
deleted = 0

def request(user, method, path):
    cmd = [
        "curl", "-sS", "-k",
        "-u", f"{user}:{password}",
        "-H", "kbn-xsrf: true",
        "-H", "x-elastic-internal-origin: Kibana",
        "-H", "Content-Type: application/json",
        "-o", tmp_path,
        "-X", method,
        f"{api_base}{path}",
    ]
    subprocess.run(cmd, check=False)

for user in users:
    request(user, "GET", "/conversations")
    with open(tmp_path) as handle:
        body = json.load(handle)
    if body.get("statusCode"):
        continue
    for row in body.get("results", []):
        conversation_id = row.get("id")
        if not conversation_id or conversation_id in seen:
            continue
        seen.add(conversation_id)
        request("analyst_a", "DELETE", f"/conversations/{conversation_id}")
        with open(tmp_path) as handle:
            result = json.load(handle)
        if result.get("success"):
            deleted += 1
            print(f"  deleted {conversation_id}")

print(f"  removed {deleted} conversation(s)")
PY
  echo
}

INCIDENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
RESEARCH_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
TMP="$(mktemp)"

echo "== Option B POC demo seed =="
echo "Kibana: $KIBANA_URL"
echo

echo "Ensuring demo users..."
ensure_user "analyst_a" "Analyst A"
ensure_user "analyst_b" "Analyst B"
echo

delete_all_demo_conversations

ANALYST_A_UID="analyst-a-uid"
ANALYST_B_UID="analyst-b-uid"

echo "Creating collaborative incident ($INCIDENT_ID) as analyst_a..."
kibana_as analyst_a -X POST "$API/converse" -d "$(python3 - <<PY
import json
print(json.dumps({
  "conversation_id": "$INCIDENT_ID",
  "input": "@agent triage this alert — is svc-deploy compromised? Multiple failed logins then success from 203.0.113.44 on prod-web-01."
}))
PY
)" >"$TMP"
require_ok "incident converse" "$TMP"
echo "  agent round created"

echo "Patching incident template + custom fields..."
kibana_as analyst_a -X PATCH "$INTERNAL/conversations/$INCIDENT_ID" -d '{
  "title": "Suspicious login on prod-web-01",
  "template_id": "incident-triage-v2",
  "custom_fields": {
    "severity": "high",
    "status": "in progress",
    "mitre_technique": "T1078",
    "affected_host": "prod-web-01"
  }
}' >"$TMP"
require_ok "incident patch" "$TMP"
echo "  template applied"

echo "Updating severity as analyst_b (activity audit event)..."
kibana_as analyst_b -X PATCH "$INTERNAL/conversations/$INCIDENT_ID" -d '{
  "custom_fields": {
    "severity": "critical",
    "status": "in progress",
    "mitre_technique": "T1078",
    "affected_host": "prod-web-01"
  }
}' >"$TMP"
require_ok "incident severity audit" "$TMP"
echo "  severity audit event appended"

echo "Assigning incident owner as analyst_a (assignee audit event)..."
kibana_as analyst_a -X PATCH "$INTERNAL/conversations/$INCIDENT_ID" -d "$(python3 - <<PY
import json
print(json.dumps({
  "custom_fields": {
    "severity": "critical",
    "status": "in progress",
    "mitre_technique": "T1078",
    "affected_host": "prod-web-01",
    "assignees": [
      {"uid": "$ANALYST_A_UID", "username": "analyst_a"},
      {"uid": "$ANALYST_B_UID", "username": "analyst_b"}
    ]
  }
}))
PY
)" >"$TMP"
require_ok "incident assignees audit" "$TMP"
echo "  assignee audit event appended"

echo "Closing incident status as analyst_b (status audit event)..."
kibana_as analyst_b -X PATCH "$INTERNAL/conversations/$INCIDENT_ID" -d "$(python3 - <<PY
import json
print(json.dumps({
  "custom_fields": {
    "severity": "critical",
    "status": "closed",
    "mitre_technique": "T1078",
    "affected_host": "prod-web-01",
    "assignees": [
      {"uid": "$ANALYST_A_UID", "username": "analyst_a"},
      {"uid": "$ANALYST_B_UID", "username": "analyst_b"}
    ]
  }
}))
PY
)" >"$TMP"
require_ok "incident status audit" "$TMP"
echo "  status audit event appended"

echo "Adding incident attachment..."
kibana_as analyst_a -X POST "$API/conversations/$INCIDENT_ID/attachments" -d '{
  "type": "text",
  "description": "Raw alert export",
  "data": {
    "content": "Alert: Multiple failed logins followed by successful auth from 203.0.113.44\nUser: svc-deploy\nHost: prod-web-01\nRule: External user login after brute force"
  }
}' >"$TMP"
require_ok "incident attachment" "$TMP"
echo "  attachment added"

echo "Appending human notes..."
kibana_as analyst_a -X POST "$API/conversations/$INCIDENT_ID/messages" -d '{
  "message": "Isolating prod-web-01 now. Paging on-call for credential rotation."
}' >"$TMP"
require_ok "analyst_a note" "$TMP"
kibana_as analyst_b -X POST "$API/conversations/$INCIDENT_ID/messages" -d '{
  "message": "Confirmed isolate workflow started. Same source IP in yesterdays VPN logs — adding to timeline."
}' >"$TMP"
require_ok "analyst_b note" "$TMP"
kibana_as analyst_b -X POST "$API/conversations/$INCIDENT_ID/messages" -d '{
  "message": "Added firewall block for 203.0.113.44."
}' >"$TMP"
require_ok "analyst_b follow-up" "$TMP"
echo "  notes from analyst_a and analyst_b appended"

echo
echo "Creating research conversation ($RESEARCH_ID) as analyst_a..."
kibana_as analyst_a -X POST "$API/converse" -d "$(python3 - <<PY
import json
print(json.dumps({
  "conversation_id": "$RESEARCH_ID",
  "input": "Capture competitive intel from todays briefing on vendor X unified observability."
}))
PY
)" >"$TMP"
require_ok "research converse" "$TMP"
echo "  agent round created"

echo "Patching research template + custom fields..."
kibana_as analyst_a -X PATCH "$INTERNAL/conversations/$RESEARCH_ID" -d '{
  "title": "Competitive notes: observability vendors Q2",
  "template_id": "research-notes-v1",
  "custom_fields": {
    "topic": "competitive",
    "priority": "medium",
    "summary": "Draft positioning against vendor X unified observability story.",
    "reference_url": "https://example.com/vendor-x-q2-brief"
  }
}' >"$TMP"
require_ok "research patch" "$TMP"

echo "Raising research priority as analyst_a (audit event)..."
kibana_as analyst_a -X PATCH "$INTERNAL/conversations/$RESEARCH_ID" -d '{
  "custom_fields": {
    "topic": "competitive",
    "priority": "high",
    "summary": "Draft positioning against vendor X unified observability story.",
    "reference_url": "https://example.com/vendor-x-q2-brief"
  }
}' >"$TMP"
require_ok "research priority audit" "$TMP"
echo "  priority audit event appended"

echo "Adding research attachment..."
kibana_as analyst_a -X POST "$API/conversations/$RESEARCH_ID/attachments" -d '{
  "type": "text",
  "description": "Meeting notes",
  "data": {
    "content": "Vendor X emphasizes AI-assisted RCA and lower ingest cost. Gap: weak on-chain audit for agent actions."
  }
}' >"$TMP"
require_ok "research attachment" "$TMP"
echo "  attachment added"

rm -f "$TMP"

echo
echo "Done. Open in Agent Builder:"
echo "  Incident:  ${KIBANA_URL}/app/agent_builder/conversations/${INCIDENT_ID}"
echo "  Research:  ${KIBANA_URL}/app/agent_builder/conversations/${RESEARCH_ID}"
echo
echo "Log in as analyst_a or analyst_b (password: changeme)"
