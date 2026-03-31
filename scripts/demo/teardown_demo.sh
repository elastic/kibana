#!/usr/bin/env bash
# Tear down all resources created by setup_e2e_demo.sh.
#
# Usage: ./teardown_demo.sh [--delete-indices]
#
# Flags:
#   --delete-indices  Also delete the CVE index and alert indices
set -euo pipefail

GCP_PROJECT="elastic-security-dev"
GCP_ZONE="us-central1-a"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
AUTH="elastic:changeme"

DELETE_INDICES=false
for arg in "$@"; do
  if [[ "${arg}" == "--delete-indices" ]]; then
    DELETE_INDICES=true
  fi
done

echo "=== Vulnerability Checker E2E Demo - Teardown ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── 1. Delete GCP VMs ───────────────────────────────────────────────────
echo "--- Deleting GCP VMs ---"
VM_NAMES=(
  vuln-demo-fleet-server
  vuln-demo-1
  vuln-demo-2
  vuln-demo-3
  vuln-demo-4
  vuln-demo-5
)

for vm in "${VM_NAMES[@]}"; do
  echo "Deleting ${vm}..."
  gcloud compute instances delete "${vm}" \
    --project="${GCP_PROJECT}" \
    --zone="${GCP_ZONE}" \
    --quiet 2>&1 || echo "  ${vm} not found or already deleted"
done

# ── 2. Unenroll agents from Fleet ───────────────────────────────────────
echo ""
echo "--- Cleaning up Fleet ---"
AGENTS=$(curl -sf -u "${AUTH}" -H "kbn-xsrf: true" \
  "${KIBANA_URL}/api/fleet/agents?kuery=local_metadata.host.hostname:vuln-demo*&perPage=20" 2>/dev/null || echo '{}')

AGENT_IDS=$(echo "${AGENTS}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', d.get('list', []))
    ids = [a['id'] for a in items]
    print(' '.join(ids))
except: print('')
" 2>/dev/null)

if [[ -n "${AGENT_IDS}" ]]; then
  for agent_id in ${AGENT_IDS}; do
    echo "  Unenrolling agent ${agent_id}..."
    curl -sf -X POST -u "${AUTH}" -H "kbn-xsrf: true" -H "Content-Type: application/json" \
      "${KIBANA_URL}/api/fleet/agents/${agent_id}/unenroll" \
      -d '{"revoke": true}' >/dev/null 2>&1 || true
  done
else
  echo "  No demo agents found to unenroll"
fi

# ── 3. Delete agent policy ──────────────────────────────────────────────
echo ""
echo "--- Deleting agent policy ---"
POLICY_ID=$(curl -sf -u "${AUTH}" -H "kbn-xsrf: true" \
  "${KIBANA_URL}/api/fleet/agent_policies?kuery=name:%22vuln-demo-agents%22" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', [])
    print(items[0]['id'] if items else '')
except: print('')
" 2>/dev/null)

if [[ -n "${POLICY_ID}" ]]; then
  curl -sf -X POST -u "${AUTH}" -H "kbn-xsrf: true" -H "Content-Type: application/json" \
    "${KIBANA_URL}/api/fleet/agent_policies/delete" \
    -d "{\"agentPolicyId\": \"${POLICY_ID}\"}" >/dev/null 2>&1 || true
  echo "  Deleted policy: ${POLICY_ID}"
else
  echo "  Policy vuln-demo-agents not found"
fi

# ── 4. Delete detection rules ───────────────────────────────────────────
echo ""
echo "--- Deleting detection rules ---"
RULES=$(curl -sf -u "${AUTH}" -H "kbn-xsrf: true" \
  "${KIBANA_URL}/api/detection_engine/rules/_find?filter=alert.attributes.tags:Demo&per_page=20" 2>/dev/null || echo '{}')

RULE_IDS=$(echo "${RULES}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    rules = d.get('data', [])
    ids = [r['id'] for r in rules]
    print(' '.join(ids))
except: print('')
" 2>/dev/null)

if [[ -n "${RULE_IDS}" ]]; then
  for rule_id in ${RULE_IDS}; do
    echo "  Deleting rule ${rule_id}..."
    curl -sf -X DELETE -u "${AUTH}" -H "kbn-xsrf: true" \
      "${KIBANA_URL}/api/detection_engine/rules?id=${rule_id}" >/dev/null 2>&1 || true
  done
else
  echo "  No demo rules found"
fi

# ── 5. Optionally delete indices ─────────────────────────────────────────
if [[ "${DELETE_INDICES}" == "true" ]]; then
  echo ""
  echo "--- Deleting indices ---"
  for idx in ".security-vulnerability-cve-default" ".security-vulnerability-epss-cache"; do
    echo "  Deleting ${idx}..."
    curl -sf -X DELETE -u "${AUTH}" "${ES_URL}/${idx}" >/dev/null 2>&1 || true
  done
  echo "  NOTE: Alert index (.alerts-security.alerts-default) not deleted — managed by Kibana"
fi

cat <<EOF

=== Teardown Complete ===
  VMs deleted: ${#VM_NAMES[@]}
  Agents unenrolled: $(echo "${AGENT_IDS}" | wc -w | tr -d ' ')
  Policy removed: ${POLICY_ID:-none}
  Rules removed: $(echo "${RULE_IDS}" | wc -w | tr -d ' ')
  Indices deleted: ${DELETE_INDICES}
EOF
