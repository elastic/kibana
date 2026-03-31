#!/usr/bin/env bash
# Create vulnerability_check and cve_watch detection rules via Kibana API.
#
# Usage: ./create_rules.sh
#
# Expects:
#   KIBANA_URL        (default: http://localhost:5601)
#   FLEET_POLICY_ID   (required — the agent policy targeting demo VMs)
set -euo pipefail

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
AUTH="elastic:changeme"
FLEET_POLICY_ID="${FLEET_POLICY_ID:-}"

if [[ -z "${FLEET_POLICY_ID}" ]]; then
  echo "ERROR: FLEET_POLICY_ID is required" >&2
  exit 1
fi

kbn() {
  local method="$1" path="$2"; shift 2
  curl -sf -X "${method}" \
    -u "${AUTH}" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    "${KIBANA_URL}${path}" "$@"
}

echo "=== Creating Detection Rules ==="

# ── 1. Create Vulnerability Check rule ───────────────────────────────────
echo "--- Creating Vulnerability Check rule ---"
VULN_RESPONSE=$(kbn POST "/api/detection_engine/rules" -d "{
  \"type\": \"vulnerability_check\",
  \"name\": \"[Demo] Vulnerability Check - All Endpoints\",
  \"description\": \"Scans endpoint package inventory via osquery and correlates against CVE index. Demo rule for vulnerability checker spike.\",
  \"risk_score\": 70,
  \"severity\": \"high\",
  \"enabled\": true,
  \"tags\": [\"Vulnerability\", \"Demo\", \"Osquery\"],
  \"interval\": \"5m\",
  \"from\": \"now-6m\",
  \"to\": \"now\",
  \"max_signals\": 1000,
  \"agent_policy_ids\": [\"${FLEET_POLICY_ID}\"],
  \"cve_index_pattern\": \".security-vulnerability-cve-*\",
  \"min_cvss_score\": 0,
  \"correlation_timespan\": \"24h\",
  \"group_by\": [\"host.name\"],
  \"actions\": [],
  \"throttle\": \"no_actions\"
}" 2>&1 || echo '{"error": "rule creation failed"}')

VULN_RULE_ID=$(echo "${VULN_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('id', d.get('error', 'unknown')))
except: print('parse-error')
" 2>/dev/null)

echo "Vulnerability Check Rule ID: ${VULN_RULE_ID}"
if [[ "${VULN_RULE_ID}" == "parse-error" ]] || [[ "${VULN_RULE_ID}" == *"error"* ]] || [[ "${VULN_RULE_ID}" == "unknown" ]]; then
  echo "WARNING: Rule creation may have failed. Response:" >&2
  echo "${VULN_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${VULN_RESPONSE}" >&2
fi

# ── 2. Create CVE Watch rule ────────────────────────────────────────────
echo "--- Creating CVE Watch rule ---"
CVE_WATCH_RESPONSE=$(kbn POST "/api/detection_engine/rules" -d "{
  \"type\": \"query\",
  \"name\": \"[Demo] CVE Watch - Critical CVEs (CVSS >= 9.0)\",
  \"description\": \"Monitors for newly published critical CVEs and generates alerts. Demo companion rule for vulnerability checker spike.\",
  \"risk_score\": 90,
  \"severity\": \"critical\",
  \"enabled\": true,
  \"tags\": [\"Vulnerability\", \"Demo\", \"CVE Watch\"],
  \"interval\": \"1h\",
  \"from\": \"now-2h\",
  \"to\": \"now\",
  \"max_signals\": 100,
  \"index\": [\".security-vulnerability-cve-*\"],
  \"query\": \"cve.cvss_score >= 9.0\",
  \"language\": \"kuery\",
  \"actions\": [],
  \"throttle\": \"no_actions\"
}" 2>&1 || echo '{"error": "rule creation failed"}')

CVE_WATCH_RULE_ID=$(echo "${CVE_WATCH_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('id', d.get('error', 'unknown')))
except: print('parse-error')
" 2>/dev/null)

echo "CVE Watch Rule ID: ${CVE_WATCH_RULE_ID}"
if [[ "${CVE_WATCH_RULE_ID}" == "parse-error" ]] || [[ "${CVE_WATCH_RULE_ID}" == *"error"* ]] || [[ "${CVE_WATCH_RULE_ID}" == "unknown" ]]; then
  echo "WARNING: Rule creation may have failed. Response:" >&2
  echo "${CVE_WATCH_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${CVE_WATCH_RESPONSE}" >&2
fi

cat <<EOF

=== Detection Rules Created ===
  Vulnerability Check: ${VULN_RULE_ID}
  CVE Watch:           ${CVE_WATCH_RULE_ID}

Both rules are enabled and will execute on schedule.
  - Vulnerability Check: every 5 minutes
  - CVE Watch: every 1 hour

Check rule status:
  curl -u ${AUTH} "${KIBANA_URL}/api/detection_engine/rules/_find?filter=alert.attributes.tags:Demo"
EOF
