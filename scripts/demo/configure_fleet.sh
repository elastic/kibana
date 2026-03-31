#!/usr/bin/env bash
# Configure Fleet: create agent policy with osquery_manager integration
# and vulnerability inventory osquery packs for the demo VMs.
#
# Usage: ./configure_fleet.sh
#
# Expects:
#   KIBANA_URL  (default: http://localhost:5601)
#   ES_URL      (default: http://localhost:9200)
set -euo pipefail

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
AUTH="elastic:changeme"
POLICY_NAME="vuln-demo-agents"
POLICY_NAMESPACE="default"

kbn() {
  local method="$1" path="$2"; shift 2
  curl -sf -X "${method}" \
    -u "${AUTH}" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    "${KIBANA_URL}${path}" "$@"
}

echo "=== Configuring Fleet for Vulnerability Demo ==="

# ── 1. Wait for Kibana ───────────────────────────────────────────────────
echo "Waiting for Kibana at ${KIBANA_URL}..."
KIBANA_UP=false
for i in $(seq 1 30); do
  if curl -sf -u "${AUTH}" "${KIBANA_URL}/api/status" >/dev/null 2>&1; then
    echo "Kibana is up"
    KIBANA_UP=true
    break
  fi
  echo "  attempt ${i}/30..."
  sleep 5
done
if [[ "${KIBANA_UP}" != "true" ]]; then
  echo "ERROR: Kibana not reachable at ${KIBANA_URL} after 150s" >&2
  exit 1
fi

# ── 2. Create agent policy ──────────────────────────────────────────────
echo "--- Creating agent policy: ${POLICY_NAME} ---"
POLICY_RESPONSE=$(kbn POST "/api/fleet/agent_policies" \
  -d "{
    \"name\": \"${POLICY_NAME}\",
    \"namespace\": \"${POLICY_NAMESPACE}\",
    \"description\": \"Vulnerability checker demo - 5 GCP VMs with osquery\",
    \"monitoring_enabled\": [\"logs\", \"metrics\"],
    \"is_managed\": false
  }" 2>/dev/null || echo '{}')

POLICY_ID=$(echo "${POLICY_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('item', {}).get('id', ''))
except: print('')
" 2>/dev/null)

if [[ -z "${POLICY_ID}" ]]; then
  echo "Policy may already exist, looking it up..."
  POLICY_ID=$(kbn GET "/api/fleet/agent_policies?kuery=name:%22${POLICY_NAME}%22" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', [])
    print(items[0]['id'] if items else '')
except: print('')
" 2>/dev/null)
fi

if [[ -z "${POLICY_ID}" ]]; then
  echo "ERROR: Could not create or find agent policy" >&2
  exit 1
fi
echo "Agent Policy ID: ${POLICY_ID}"

# ── 3. Add osquery_manager integration ───────────────────────────────────
echo "--- Adding osquery_manager integration ---"

OSQUERY_VERSION=$(kbn GET "/api/fleet/epm/packages/osquery_manager" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('item', d.get('response', {})).get('version', ''))
except: print('')
" 2>/dev/null)

if [[ -z "${OSQUERY_VERSION}" ]]; then
  OSQUERY_VERSION="1.12.2"
  echo "WARNING: Could not fetch latest osquery_manager version, using ${OSQUERY_VERSION}"
fi
echo "Using osquery_manager version: ${OSQUERY_VERSION}"

OSQUERY_RESPONSE=$(kbn POST "/api/fleet/package_policies" \
  -d "{
    \"name\": \"vuln-demo-osquery\",
    \"namespace\": \"${POLICY_NAMESPACE}\",
    \"policy_id\": \"${POLICY_ID}\",
    \"package\": {
      \"name\": \"osquery_manager\",
      \"title\": \"Osquery Manager\",
      \"version\": \"${OSQUERY_VERSION}\"
    },
    \"inputs\": [
      {
        \"type\": \"osquery\",
        \"enabled\": true,
        \"streams\": [],
        \"config\": {
          \"osquery\": {
            \"value\": {
              \"packs\": {
                \"vulnerability-inventory\": {
                  \"queries\": {
                    \"deb_packages\": {
                      \"query\": \"SELECT name, version, source, arch FROM deb_packages\",
                      \"interval\": 300,
                      \"platform\": \"linux\",
                      \"description\": \"Installed Debian/Ubuntu packages\"
                    },
                    \"rpm_packages\": {
                      \"query\": \"SELECT name, version, release, arch, source FROM rpm_packages\",
                      \"interval\": 300,
                      \"platform\": \"linux\",
                      \"description\": \"Installed RPM packages\"
                    },
                    \"os_version\": {
                      \"query\": \"SELECT name, version, major, minor, patch, platform FROM os_version\",
                      \"interval\": 300,
                      \"platform\": \"linux\",
                      \"description\": \"OS version\"
                    }
                  },
                  \"shard\": 100
                }
              }
            }
          }
        }
      }
    ]
  }" 2>/dev/null || echo '{}')

PKG_POLICY_ID=$(echo "${OSQUERY_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('item', {}).get('id', ''))
except: print('')
" 2>/dev/null)

if [[ -n "${PKG_POLICY_ID}" ]]; then
  echo "Osquery package policy created: ${PKG_POLICY_ID}"
else
  echo "WARNING: osquery integration may already exist or failed to create"
fi

# ── 4. Create enrollment token ───────────────────────────────────────────
echo "--- Getting enrollment token ---"
TOKEN_RESPONSE=$(kbn GET "/api/fleet/enrollment_api_keys?kuery=policy_id:${POLICY_ID}" 2>/dev/null || echo '{}')
ENROLLMENT_TOKEN=$(echo "${TOKEN_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    items = d.get('items', d.get('list', []))
    print(items[0]['api_key'] if items else '')
except: print('')
" 2>/dev/null)

if [[ -z "${ENROLLMENT_TOKEN}" ]]; then
  echo "Creating new enrollment key..."
  NEW_KEY=$(kbn POST "/api/fleet/enrollment_api_keys" \
    -d "{\"policy_id\": \"${POLICY_ID}\"}" 2>/dev/null || echo '{}')
  ENROLLMENT_TOKEN=$(echo "${NEW_KEY}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('item', {}).get('api_key', ''))
except: print('')
" 2>/dev/null)
fi

echo "Enrollment Token: ${ENROLLMENT_TOKEN}"

# ── 5. Output summary ───────────────────────────────────────────────────
cat <<EOF

=== Fleet Configuration Complete ===
  Agent Policy ID:    ${POLICY_ID}
  Policy Name:        ${POLICY_NAME}
  Osquery Policy ID:  ${PKG_POLICY_ID:-existing}
  Enrollment Token:   ${ENROLLMENT_TOKEN}

Use these values in setup_e2e_demo.sh:
  export FLEET_POLICY_ID="${POLICY_ID}"
  export FLEET_ENROLLMENT_TOKEN="${ENROLLMENT_TOKEN}"
EOF
