#!/usr/bin/env bash
# =============================================================================
# Alert Investigation Pipeline — Demo Setup
# =============================================================================
#
# Usage:
#   ./scripts/demo_setup.sh [command]
#
# Commands:
#   start       Start ES + Kibana (default)
#   alerts      Ingest test alerts into .alerts-security.alerts-default
#   trigger     Trigger the pipeline workflow
#   status      Check ES/Kibana/workflow status
#   cleanup     Delete test alerts and cases
#   all         start → wait → alerts → trigger
#
# Prerequisites:
#   - yarn kbn bootstrap (already done)
#   - config/kibana.dev.yml with elasticAssistant.alertInvestigationPipelineEnabled: true
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ES_URL="${ES_URL:-http://localhost:9200}"
ES_AUTH="${ES_AUTH:-elastic:changeme}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
KIBANA_AUTH="${KIBANA_AUTH:-elastic:changeme}"
ALERTS_INDEX=".alerts-security.alerts-default"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}▸${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

es_curl() {
  curl -s -u "$ES_AUTH" "$@"
}

kb_curl() {
  curl -s -u "$KIBANA_AUTH" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: Kibana" \
    -H "Content-Type: application/json" \
    "$@"
}

# ---------------------------------------------------------------------------
# check_status — verify ES and Kibana are reachable
# ---------------------------------------------------------------------------
check_status() {
  log "Checking Elasticsearch at $ES_URL..."
  local es_code
  es_code=$(curl -s -o /dev/null -w "%{http_code}" -u "$ES_AUTH" "$ES_URL" 2>/dev/null || echo "000")
  if [[ "$es_code" == "200" ]]; then
    ok "Elasticsearch is running"
  else
    err "Elasticsearch not reachable (HTTP $es_code)"
    return 1
  fi

  log "Checking Kibana at $KIBANA_URL..."
  local kb_code
  kb_code=$(curl -s -o /dev/null -w "%{http_code}" "$KIBANA_URL/api/status" 2>/dev/null || echo "000")
  if [[ "$kb_code" == "200" ]]; then
    ok "Kibana is running"
  else
    warn "Kibana not reachable (HTTP $kb_code)"
  fi

  # Check alert index
  log "Checking alerts index..."
  local idx_code
  idx_code=$(curl -s -o /dev/null -w "%{http_code}" -u "$ES_AUTH" "$ES_URL/$ALERTS_INDEX" 2>/dev/null || echo "000")
  if [[ "$idx_code" == "200" ]]; then
    local count
    count=$(es_curl "$ES_URL/$ALERTS_INDEX/_count" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
    ok "Alerts index exists ($count documents)"
  else
    warn "Alerts index does not exist yet (will be created by Detection Engine or by 'alerts' command)"
  fi
}

# ---------------------------------------------------------------------------
# start_es — start Elasticsearch via yarn
# ---------------------------------------------------------------------------
start_es() {
  log "Starting Elasticsearch..."
  echo ""
  echo "  Run in a separate terminal:"
  echo ""
  echo -e "    ${GREEN}cd $REPO_ROOT${NC}"
  echo -e "    ${GREEN}yarn es snapshot --license trial -E xpack.security.authc.api_key.enabled=true${NC}"
  echo ""
  echo "  Wait for 'started' message, then run:"
  echo -e "    ${GREEN}./scripts/demo_setup.sh alerts${NC}"
  echo ""
}

# ---------------------------------------------------------------------------
# start_kibana — start Kibana via yarn
# ---------------------------------------------------------------------------
start_kibana() {
  log "Starting Kibana..."
  echo ""
  echo "  Run in another terminal:"
  echo ""
  echo -e "    ${GREEN}cd $REPO_ROOT${NC}"
  echo -e "    ${GREEN}yarn start --no-base-path${NC}"
  echo ""
  echo "  Wait for 'http server running' message, then run:"
  echo -e "    ${GREEN}./scripts/demo_setup.sh alerts${NC}"
  echo ""
}

# ---------------------------------------------------------------------------
# create_alerts_index — ensure the alerts index exists with the right mapping
# ---------------------------------------------------------------------------
create_alerts_index() {
  local idx_code
  idx_code=$(curl -s -o /dev/null -w "%{http_code}" -u "$ES_AUTH" "$ES_URL/$ALERTS_INDEX" 2>/dev/null || echo "000")

  if [[ "$idx_code" == "200" ]]; then
    ok "Alerts index already exists"
    return 0
  fi

  log "Creating alerts index with security mapping..."
  es_curl -X PUT "$ES_URL/$ALERTS_INDEX" -H "Content-Type: application/json" -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "kibana.alert.rule.name": { "type": "keyword" },
        "kibana.alert.rule.uuid": { "type": "keyword" },
        "kibana.alert.severity": { "type": "keyword" },
        "kibana.alert.risk_score": { "type": "float" },
        "kibana.alert.workflow_status": { "type": "keyword" },
        "kibana.alert.workflow_tags": { "type": "keyword" },
        "kibana.alert.building_block_type": { "type": "keyword" },
        "kibana.alert.pipeline.processed": { "type": "boolean" },
        "host.name": { "type": "keyword" },
        "host.ip": { "type": "ip" },
        "host.os.name": { "type": "keyword" },
        "user.name": { "type": "keyword" },
        "process.name": { "type": "keyword" },
        "process.executable": { "type": "keyword" },
        "process.hash.sha256": { "type": "keyword" },
        "source.ip": { "type": "ip" },
        "destination.ip": { "type": "ip" },
        "destination.domain": { "type": "keyword" },
        "file.name": { "type": "keyword" },
        "file.hash.sha256": { "type": "keyword" },
        "dns.question.name": { "type": "keyword" },
        "url.full": { "type": "keyword" },
        "event.action": { "type": "keyword" },
        "event.category": { "type": "keyword" }
      }
    }
  }' > /dev/null 2>&1

  ok "Created alerts index"
}

# ---------------------------------------------------------------------------
# ingest_alerts — bulk-index diverse test alerts
# ---------------------------------------------------------------------------
ingest_alerts() {
  log "Ingesting test alerts into $ALERTS_INDEX..."
  create_alerts_index

  local now_ms
  now_ms=$(date +%s)

  # Generate bulk payload with diverse, realistic alerts
  # Scenario: multi-stage attack across 4 hosts, 3 users
  local bulk_payload=""

  # Helper to add an alert
  add_alert() {
    local id="$1" rule="$2" severity="$3" risk="$4" host="$5" host_ip="$6"
    local user="$7" process="$8" dest_ip="$9" domain="${10}" action="${11}"
    local offset_min="${12:-0}"

    local ts
    ts=$(date -u -r $((now_ms - offset_min * 60)) +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || \
         date -u -d "@$((now_ms - offset_min * 60))" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null)

    bulk_payload+='{"index":{"_index":"'"$ALERTS_INDEX"'","_id":"demo-'"$id"'"}}'$'\n'
    bulk_payload+='{
      "@timestamp": "'"$ts"'",
      "kibana.alert.rule.name": "'"$rule"'",
      "kibana.alert.rule.uuid": "rule-'"$id"'",
      "kibana.alert.severity": "'"$severity"'",
      "kibana.alert.risk_score": '"$risk"',
      "kibana.alert.workflow_status": "open",
      "host.name": "'"$host"'",
      "host.ip": ["'"$host_ip"'"],
      "user.name": "'"$user"'",
      "process.name": "'"$process"'",
      "source.ip": "'"$host_ip"'",
      "destination.ip": "'"$dest_ip"'",
      "destination.domain": "'"$domain"'",
      "event.action": "'"$action"'",
      "event.category": ["malware"]
    }'$'\n'
  }

  # ── Attack scenario 1: SRVWIN01 / admin — lateral movement campaign ──
  add_alert "lat-1" "Lateral Movement via Remote Services"  "critical" 91 "SRVWIN01" "10.0.1.50" "admin" "psexec.exe"    "10.0.2.100" "dc01.corp.local"  "connection_attempted" 5
  add_alert "lat-2" "Credential Dumping Detected"           "critical" 88 "SRVWIN01" "10.0.1.50" "admin" "mimikatz.exe"  "10.0.0.1"   "dc01.corp.local"  "process_started"      4
  add_alert "lat-3" "Suspicious Process Execution"          "high"     75 "SRVWIN01" "10.0.1.50" "admin" "powershell.exe" "185.220.101.42" "c2-server.evil.com" "execution" 3
  add_alert "lat-4" "Lateral Movement via Remote Services"  "critical" 91 "SRVWIN01" "10.0.1.50" "admin" "psexec.exe"    "10.0.2.101" "dc02.corp.local"  "connection_attempted" 2

  # ── Attack scenario 2: SRVDB02 / SYSTEM — ransomware attack ──
  add_alert "ran-1" "Ransomware Behavior Detected"          "critical" 99 "SRVDB02"  "10.0.2.101" "SYSTEM" "suspicious.exe" "203.0.113.50" "malware-drop.net" "file_modified" 5
  add_alert "ran-2" "Malware Prevention Alert"              "high"     73 "SRVDB02"  "10.0.2.101" "SYSTEM" "suspicious.exe" "203.0.113.50" "malware-drop.net" "file_created"  4
  add_alert "ran-3" "Data Exfiltration via DNS"             "critical" 95 "SRVDB02"  "10.0.2.101" "SYSTEM" "dns_tunnel.exe" "198.51.100.25" "exfil.evil.com"  "dns_query"     3

  # ── Attack scenario 3: MAIL-GW01 / sarah — phishing ──
  add_alert "phi-1" "Phishing Email with Malicious Attachment" "medium" 52 "MAIL-GW01" "10.0.0.10" "sarah" "outlook.exe"   "45.33.32.156"  "evil-phishing.com" "email_received" 5
  add_alert "phi-2" "Suspicious Network Connection"            "medium" 55 "MAIL-GW01" "10.0.0.10" "sarah" "curl"          "104.248.10.1"  "crypto-miner.io"   "connection_attempted" 3

  # ── Attack scenario 4: DC01 / administrator — brute force ──
  add_alert "brut-1" "Brute Force Login Attempts"           "high"     82 "DC01"     "10.0.0.1"  "administrator" "sshd"     "185.220.101.42" "scanner.evil.com" "authentication_failure" 5
  add_alert "brut-2" "Brute Force Login Attempts"           "high"     82 "DC01"     "10.0.0.1"  "administrator" "sshd"     "185.220.101.42" "scanner.evil.com" "authentication_failure" 4
  add_alert "brut-3" "Unauthorized Access to Sensitive Files" "high"   70 "DC01"     "10.0.0.1"  "administrator" "cmd.exe"  "10.0.0.1"       "dc01.corp.local"  "file_access"           2

  # ── Duplicate alerts (should be deduped by pipeline) ──
  add_alert "dup-1" "Lateral Movement via Remote Services"   "critical" 91 "SRVWIN01" "10.0.1.50" "admin" "psexec.exe"    "10.0.2.100" "dc01.corp.local"  "connection_attempted" 1
  add_alert "dup-2" "Ransomware Behavior Detected"           "critical" 99 "SRVDB02"  "10.0.2.101" "SYSTEM" "suspicious.exe" "203.0.113.50" "malware-drop.net" "file_modified" 1

  # Bulk index
  local response
  response=$(echo "$bulk_payload" | es_curl -X POST "$ES_URL/_bulk" -H "Content-Type: application/x-ndjson" --data-binary @-)

  local errors
  errors=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', True))" 2>/dev/null || echo "true")

  if [[ "$errors" == "False" ]]; then
    ok "Ingested 14 test alerts (4 scenarios + 2 duplicates)"
  else
    warn "Some alerts may have had issues. Checking count..."
  fi

  # Verify
  sleep 1
  local count
  count=$(es_curl "$ES_URL/$ALERTS_INDEX/_count" -H "Content-Type: application/json" -d '{
    "query": {"prefix": {"_id": "demo-"}}
  }' | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")

  ok "Verified: $count demo alerts in index"
  echo ""
  echo "  Alert scenarios:"
  echo "    🔴 SRVWIN01/admin  — 4 alerts (lateral movement + credential dumping)"
  echo "    🔴 SRVDB02/SYSTEM  — 3 alerts (ransomware + exfiltration)"
  echo "    🟡 MAIL-GW01/sarah — 2 alerts (phishing + suspicious connection)"
  echo "    🟡 DC01/admin      — 3 alerts (brute force + file access)"
  echo "    ⚪ 2 duplicates    — should be deduped"
  echo ""
  echo "  Expected pipeline output:"
  echo "    → 4 entity groups → 4 cases created"
  echo "    → ~12 unique alerts (2 deduped)"
  echo ""
}

# ---------------------------------------------------------------------------
# trigger_workflow — trigger the pipeline via Workflows API
# ---------------------------------------------------------------------------
trigger_workflow() {
  log "Looking for alert-investigation-pipeline workflow..."

  local workflows
  workflows=$(kb_curl "$KIBANA_URL/api/workflows/_find?per_page=100" 2>/dev/null || echo "{}")

  local workflow_id
  workflow_id=$(echo "$workflows" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('workflows', data.get('data', [])):
    wid = w.get('id', '')
    name = w.get('name', '')
    if 'alert-investigation' in wid.lower() or 'alert investigation' in name.lower():
        print(wid)
        break
" 2>/dev/null || echo "")

  if [[ -z "$workflow_id" ]]; then
    warn "No alert-investigation-pipeline workflow found."
    echo ""
    echo "  The WorkflowInitService creates the workflow lazily on first use."
    echo "  Make sure Kibana is running and the feature flag is enabled:"
    echo "    elasticAssistant.alertInvestigationPipelineEnabled: true"
    echo ""
    echo "  You can also trigger it by calling the Agent Builder skill"
    echo "  or waiting for the scheduled trigger (every 15m)."
    echo ""

    # Try to create it manually via the API
    log "Attempting to create workflow via bulk API..."
    local yaml_response
    yaml_response=$(kb_curl -X POST "$KIBANA_URL/api/workflows/_bulk_create" -d '{
      "workflows": [{
        "id": "alert-investigation-pipeline-default",
        "overwrite": true,
        "yaml": "name: Alert Investigation Pipeline\ndescription: Demo pipeline\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: fetch_alerts\n    type: security.fetchUnprocessedAlerts\n    with:\n      index_pattern: .alerts-security.alerts-default\n      max_alerts: 500\n      lookback_minutes: 60\n  - name: deduplicate\n    type: security.deduplicateAlerts\n    with:\n      alert_ids: \"{{steps.fetch_alerts.output.alert_ids | json}}\"\n      index_pattern: .alerts-security.alerts-default\n      similarity_threshold: 0.85\n  - name: find_existing_cases\n    type: cases.findCases\n    with:\n      tags: alert-investigation-pipeline\n      status: open\n      owner: securitySolution\n      perPage: 100\n      sortOrder: desc\n  - name: match_cases\n    type: security.matchAndAttachAlertsToCases\n    with:\n      leader_alert_ids: \"{{steps.deduplicate.output.leader_alert_ids | json}}\"\n      index_pattern: .alerts-security.alerts-default\n      existing_cases: \"{{steps.find_existing_cases.output.cases | json}}\"\n  - name: handle_new_groups\n    type: foreach\n    foreach: \"{{steps.match_cases.output.new_groups}}\"\n    steps:\n      - name: create_case\n        type: cases.createCase\n        with:\n          title: \"Investigation - {{foreach.item.primary_host}} / {{foreach.item.primary_user}}\"\n          description: \"Automated case for host {{foreach.item.primary_host}}, user {{foreach.item.primary_user}}\"\n          tags:\n            - alert-investigation-pipeline\n          owner: securitySolution\n          severity: high\n      - name: attach_new_alerts\n        type: cases.addAlerts\n        with:\n          case_id: \"{{steps.create_case.output.case.id}}\"\n          alerts: \"{{foreach.item.alerts | json}}\"\n      - name: add_ad_comment_new\n        type: cases.addComment\n        with:\n          case_id: \"{{steps.create_case.output.case.id}}\"\n          comment: \"Pipeline processed {{foreach.item.alert_ids | size}} alerts for this case.\"\n  - name: tag_processed\n    type: security.tagProcessedAlerts\n    with:\n      alert_ids: \"{{steps.fetch_alerts.output.alert_ids | json}}\"\n      index_pattern: .alerts-security.alerts-default"
      }]
    }' 2>/dev/null)

    workflow_id=$(echo "$yaml_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('workflows', data.get('items', []))
if items:
    print(items[0].get('id', ''))
" 2>/dev/null || echo "")

    if [[ -n "$workflow_id" ]]; then
      ok "Created workflow: $workflow_id"
    else
      err "Could not create workflow. Response: $yaml_response"
      return 1
    fi
  else
    ok "Found workflow: $workflow_id"
  fi

  # Trigger the workflow
  log "Triggering workflow $workflow_id..."
  local trigger_response
  trigger_response=$(kb_curl -X POST "$KIBANA_URL/api/workflows/$workflow_id/_run" -d '{}' 2>/dev/null)

  local execution_id
  execution_id=$(echo "$trigger_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('execution_id', data.get('id', 'unknown')))
" 2>/dev/null || echo "unknown")

  ok "Workflow triggered! Execution: $execution_id"
  echo ""
  echo "  Monitor progress:"
  echo "    • Kibana Workflows UI: $KIBANA_URL/app/management/insightsAndAlerting/weightedWorkflows"
  echo "    • Cases: $KIBANA_URL/app/security/cases"
  echo "    • Kibana logs: check for [elasticAssistant.alertInvestigation]"
  echo ""
}

# ---------------------------------------------------------------------------
# cleanup — remove test data
# ---------------------------------------------------------------------------
cleanup() {
  log "Cleaning up demo data..."

  # Delete test alerts
  local del_response
  del_response=$(es_curl -X POST "$ES_URL/$ALERTS_INDEX/_delete_by_query" \
    -H "Content-Type: application/json" \
    -d '{"query": {"prefix": {"_id": "demo-"}}}' 2>/dev/null)

  local deleted
  deleted=$(echo "$del_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('deleted',0))" 2>/dev/null || echo "0")
  ok "Deleted $deleted demo alerts"

  # Delete pipeline cases
  log "Finding pipeline cases to delete..."
  local cases_response
  cases_response=$(kb_curl "$KIBANA_URL/api/cases/_find?tags=alert-investigation-pipeline&perPage=100" 2>/dev/null)

  local case_ids
  case_ids=$(echo "$cases_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ids = [c['id'] for c in data.get('cases', [])]
print(' '.join(ids))
" 2>/dev/null || echo "")

  if [[ -n "$case_ids" ]]; then
    local id_params=""
    for cid in $case_ids; do
      id_params+="ids=${cid}&"
    done
    kb_curl -X DELETE "$KIBANA_URL/api/cases?${id_params%&}" > /dev/null 2>&1
    ok "Deleted $(echo "$case_ids" | wc -w | tr -d ' ') pipeline cases"
  else
    ok "No pipeline cases found"
  fi
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
main() {
  local cmd="${1:-start}"

  echo ""
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║   Alert Investigation Pipeline — Demo Setup          ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""

  case "$cmd" in
    start)
      start_es
      start_kibana
      ;;
    alerts)
      ingest_alerts
      ;;
    trigger)
      trigger_workflow
      ;;
    status)
      check_status
      ;;
    cleanup)
      cleanup
      ;;
    all)
      start_es
      start_kibana
      echo "  After ES + Kibana are running, this script will:"
      echo "    1. Ingest 14 test alerts"
      echo "    2. Trigger the pipeline workflow"
      echo ""
      echo "  Run these commands in order:"
      echo -e "    ${GREEN}./scripts/demo_setup.sh status${NC}    # verify ES+Kibana"
      echo -e "    ${GREEN}./scripts/demo_setup.sh alerts${NC}    # ingest test data"
      echo -e "    ${GREEN}./scripts/demo_setup.sh trigger${NC}   # run pipeline"
      echo ""
      ;;
    *)
      echo "Usage: $0 {start|alerts|trigger|status|cleanup|all}"
      echo ""
      echo "Commands:"
      echo "  start    Show instructions to start ES + Kibana"
      echo "  alerts   Ingest 14 test alerts (4 attack scenarios)"
      echo "  trigger  Trigger the pipeline workflow"
      echo "  status   Check ES/Kibana/index health"
      echo "  cleanup  Delete test alerts and pipeline cases"
      echo "  all      Show full setup instructions"
      exit 1
      ;;
  esac
}

main "$@"
