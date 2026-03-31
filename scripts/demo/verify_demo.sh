#!/usr/bin/env bash
# Verify the Vulnerability Checker E2E demo is working end-to-end.
# Checks Fleet health, osquery data, CVE index, alerts, and dashboard data.
#
# Usage: ./verify_demo.sh
#
# Expects:
#   ES_URL      (default: http://localhost:9200)
#   KIBANA_URL  (default: http://localhost:5601)
set -euo pipefail

ES_URL="${ES_URL:-http://localhost:9200}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
AUTH="elastic:changeme"

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1" result="$2" expected="$3"
  if [[ "${result}" == "${expected}" ]]; then
    echo "  PASS  ${label}: ${result}"
    ((PASS++))
  elif [[ "${result}" =~ ^[0-9]+$ ]] && [[ "${expected}" =~ ^[0-9]+$ ]] && [[ "${result}" -ge "${expected}" ]]; then
    echo "  PASS  ${label}: ${result} (expected >= ${expected})"
    ((PASS++))
  else
    echo "  FAIL  ${label}: ${result} (expected: ${expected})"
    ((FAIL++))
  fi
}

warn_check() {
  local label="$1" result="$2" expected="$3"
  if [[ "${result}" =~ ^[0-9]+$ ]] && [[ "${result}" -ge "${expected}" ]]; then
    echo "  PASS  ${label}: ${result} (expected >= ${expected})"
    ((PASS++))
  else
    echo "  WARN  ${label}: ${result} (expected >= ${expected}) -- may need more time"
    ((WARN++))
  fi
}

es() {
  curl -sf -X "$1" -u "${AUTH}" -H "Content-Type: application/json" "${ES_URL}$2" "${@:3}"
}

kbn() {
  curl -sf -X "$1" -u "${AUTH}" -H "kbn-xsrf: true" -H "Content-Type: application/json" "${KIBANA_URL}$2" "${@:3}"
}

echo "================================================================"
echo "  VULNERABILITY CHECKER E2E DEMO - VERIFICATION"
echo "  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "================================================================"
echo ""

# ── 1. Elasticsearch health ─────────────────────────────────────────────
echo "--- 1. Elasticsearch ---"
ES_STATUS=$(es GET "/_cluster/health" 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('status', 'unknown'))
except: print('unreachable')
" 2>/dev/null)
if [[ "${ES_STATUS}" == "green" ]]; then
  echo "  PASS  Cluster health: ${ES_STATUS}"
  ((PASS++))
elif [[ "${ES_STATUS}" == "yellow" ]]; then
  echo "  WARN  Cluster health: ${ES_STATUS} (green preferred)"
  ((WARN++))
else
  echo "  FAIL  Cluster health: ${ES_STATUS} (expected: green)"
  ((FAIL++))
fi

# ── 2. CVE Index ─────────────────────────────────────────────────────────
echo ""
echo "--- 2. CVE Index ---"
CVE_COUNT=$(es GET "/.security-vulnerability-cve-default/_count" 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)
warn_check "CVE records in index" "${CVE_COUNT}" "30"

CVE_SEVERITY=$(es POST "/.security-vulnerability-cve-default/_search" -d '{
  "size": 0,
  "aggs": { "sev": { "terms": { "field": "cve.severity" } } }
}' 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    buckets = d['aggregations']['sev']['buckets']
    parts = [f\"{b['key']}:{b['doc_count']}\" for b in buckets]
    print(' '.join(parts))
except: print('N/A')
" 2>/dev/null)
echo "  INFO  Severity distribution: ${CVE_SEVERITY}"

# ── 3. Fleet agents ─────────────────────────────────────────────────────
echo ""
echo "--- 3. Fleet Agents ---"
AGENT_DATA=$(kbn GET "/api/fleet/agents?perPage=20&showInactive=false" 2>/dev/null || echo '{}')
AGENT_ONLINE=$(echo "${AGENT_DATA}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', d.get('list', []))
    online = [a for a in items if a.get('status') == 'online']
    print(len(online))
except: print(0)
" 2>/dev/null)
warn_check "Online agents" "${AGENT_ONLINE}" "5"

AGENT_HOSTS=$(echo "${AGENT_DATA}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', d.get('list', []))
    for a in items:
        host = a.get('local_metadata', {}).get('host', {}).get('hostname', 'unknown')
        status = a.get('status', 'unknown')
        print(f'    {host}: {status}')
except: pass
" 2>/dev/null)
if [[ -n "${AGENT_HOSTS}" ]]; then
  echo "  INFO  Agent details:"
  echo "${AGENT_HOSTS}"
fi

# ── 4. Osquery results ──────────────────────────────────────────────────
echo ""
echo "--- 4. Osquery Results ---"
OSQUERY_COUNT=$(es GET "/logs-osquery_manager.result*/_count" 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)
warn_check "Osquery result documents" "${OSQUERY_COUNT}" "1"

OSQUERY_HOSTS=$(es POST "/logs-osquery_manager.result*/_search" -d '{
  "size": 0,
  "aggs": { "hosts": { "terms": { "field": "host.name", "size": 20 } } }
}' 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    buckets = d['aggregations']['hosts']['buckets']
    print(len(buckets))
except: print(0)
" 2>/dev/null)
warn_check "Hosts with osquery data" "${OSQUERY_HOSTS}" "5"

# ── 5. Vulnerability alerts ─────────────────────────────────────────────
echo ""
echo "--- 5. Vulnerability Alerts ---"
ALERT_INDEX=".alerts-security.alerts-default"

ALERT_COUNT=$(es POST "/${ALERT_INDEX}/_count" -d '{
  "query": { "term": { "kibana.alert.rule.type": "vulnerability_check" } }
}' 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)
warn_check "Vulnerability check alerts" "${ALERT_COUNT}" "1"

BUILDING_BLOCKS=$(es POST "/${ALERT_INDEX}/_count" -d '{
  "query": {
    "bool": {
      "must": [
        { "term": { "kibana.alert.rule.type": "vulnerability_check" } },
        { "exists": { "field": "kibana.alert.building_block_type" } }
      ]
    }
  }
}' 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)
warn_check "Building-block alerts" "${BUILDING_BLOCKS}" "1"

SHELL_ALERTS=$(es POST "/${ALERT_INDEX}/_count" -d '{
  "query": {
    "bool": {
      "must": [
        { "term": { "kibana.alert.rule.type": "vulnerability_check" } }
      ],
      "must_not": [
        { "exists": { "field": "kibana.alert.building_block_type" } }
      ]
    }
  }
}' 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)
warn_check "Shell alerts (per-host)" "${SHELL_ALERTS}" "1"

# ── 6. Dashboard aggregation data ───────────────────────────────────────
echo ""
echo "--- 6. Dashboard Data (Vulnerability Posture) ---"
DASHBOARD_DATA=$(es POST "/${ALERT_INDEX}/_search" -d '{
  "size": 0,
  "query": { "term": { "kibana.alert.rule.type": "vulnerability_check" } },
  "aggs": {
    "critical_cves": {
      "filter": { "term": { "vulnerability.severity": "critical" } },
      "aggs": { "unique": { "cardinality": { "field": "vulnerability.id" } } }
    },
    "affected_endpoints": { "cardinality": { "field": "host.name" } },
    "avg_risk_score": { "avg": { "field": "kibana.alert.risk_score" } },
    "total_cves": { "cardinality": { "field": "vulnerability.id" } },
    "severity_distribution": { "terms": { "field": "vulnerability.severity" } },
    "top_software": {
      "terms": { "field": "package.name", "size": 10 },
      "aggs": { "cve_count": { "cardinality": { "field": "vulnerability.id" } } }
    }
  }
}' 2>/dev/null)

if [[ -n "${DASHBOARD_DATA}" ]]; then
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    aggs = d.get('aggregations', {})

    critical = aggs.get('critical_cves', {}).get('unique', {}).get('value', 0)
    endpoints = aggs.get('affected_endpoints', {}).get('value', 0)
    avg_risk = round(aggs.get('avg_risk_score', {}).get('value', 0) or 0, 1)
    total = aggs.get('total_cves', {}).get('value', 0)

    print(f'  KPI  Critical CVEs: {critical}')
    print(f'  KPI  Affected endpoints: {endpoints}')
    print(f'  KPI  Avg risk score: {avg_risk}')
    print(f'  KPI  Total CVEs: {total}')

    sev = aggs.get('severity_distribution', {}).get('buckets', [])
    if sev:
        parts = [f'{b[\"key\"]}: {b[\"doc_count\"]}' for b in sev]
        print(f'  KPI  Severity dist: {\" | \".join(parts)}')

    sw = aggs.get('top_software', {}).get('buckets', [])
    if sw:
        print('  KPI  Top software:')
        for b in sw[:5]:
            count = b.get('cve_count', {}).get('value', b['doc_count'])
            print(f'       {b[\"key\"]}: {count} CVEs')
except Exception as e:
    print(f'  WARN  Could not parse dashboard data: {e}')
" <<< "${DASHBOARD_DATA}" 2>/dev/null
else
  echo "  WARN  No dashboard data available yet"
  ((WARN++))
fi

# ── 7. Detection rules status ───────────────────────────────────────────
echo ""
echo "--- 7. Detection Rules ---"
RULES_DATA=$(kbn GET "/api/detection_engine/rules/_find?filter=alert.attributes.tags:Demo&per_page=10" 2>/dev/null || echo '{}')
echo "${RULES_DATA}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    rules = d.get('data', [])
    for r in rules:
        name = r.get('name', 'unknown')
        enabled = r.get('enabled', False)
        status = r.get('execution_summary', {}).get('last_execution', {}).get('status', 'unknown')
        print(f'  RULE  {name}: enabled={enabled}, last_status={status}')
except: print('  WARN  Could not parse rules data')
" 2>/dev/null

# ── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  VERIFICATION SUMMARY"
echo "  PASS: ${PASS}  |  FAIL: ${FAIL}  |  WARN: ${WARN}"
if [[ ${FAIL} -eq 0 ]]; then
  echo "  STATUS: ALL CHECKS PASSED"
else
  echo "  STATUS: ${FAIL} CHECK(S) FAILED"
fi
if [[ ${WARN} -gt 0 ]]; then
  echo "  NOTE: ${WARN} warning(s) - some data may still be propagating"
  echo "  TIP: Wait 5-10 minutes and re-run this script"
fi
echo "================================================================"

exit "${FAIL}"
