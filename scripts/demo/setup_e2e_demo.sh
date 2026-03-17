#!/usr/bin/env bash
# Master orchestrator for the Vulnerability Checker E2E Demo.
# Creates GCP VMs, configures Fleet, seeds CVE data, and enrolls agents.
#
# Usage: ./setup_e2e_demo.sh
#
# Prerequisites:
#   - gcloud CLI authenticated with access to elastic-security-dev
#   - Tailscale running locally with an auth key in .env
#   - ES running locally on :9200 and Kibana on :5601
#   - kibana.dev.yml has vulnerabilityCheckerEnabled in enableExperimental
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# ── Configuration ────────────────────────────────────────────────────────
GCP_PROJECT="elastic-security-dev"
GCP_ZONE="us-central1-a"
MACHINE_TYPE="e2-medium"
LABEL="owner=vuln-checker-demo,team=security-solution"
AGENT_VERSION=$(node -e "console.log(require('${REPO_ROOT}/package.json').version)" 2>/dev/null || echo "9.0.0")

TS_HOSTNAME="macbook-pro-mac.tail9bbcc.ts.net"
FLEET_URL="https://${TS_HOSTNAME}:8220"
ES_HOST="http://${TS_HOSTNAME}:9200"
KIBANA_URL="http://localhost:5601"
ES_URL="http://localhost:9200"
AUTH="elastic:changeme"

# Load Tailscale auth key from .env
if [[ -f "${REPO_ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  source <(grep '^TS_AUTHKEY_EPHEMERAL=' "${REPO_ROOT}/.env")
fi
TS_AUTHKEY="${TS_AUTHKEY_EPHEMERAL:-}"

# VM definitions: name:image_family:image_project
declare -A VM_IMAGES
VM_IMAGES[vuln-demo-fleet-server]="debian-12:debian-cloud"
VM_IMAGES[vuln-demo-1]="debian-12:debian-cloud"
VM_IMAGES[vuln-demo-2]="debian-12:debian-cloud"
VM_IMAGES[vuln-demo-3]="ubuntu-2204-lts:ubuntu-os-cloud"
VM_IMAGES[vuln-demo-4]="ubuntu-2204-lts:ubuntu-os-cloud"
VM_IMAGES[vuln-demo-5]="ubuntu-2204-lts:ubuntu-os-cloud"

# ── Preflight ────────────────────────────────────────────────────────────
echo "=== Vulnerability Checker E2E Demo Setup ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "--- Preflight checks ---"

if ! command -v gcloud &>/dev/null; then
  echo "ERROR: gcloud CLI not found" >&2; exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "${CURRENT_PROJECT}" != "${GCP_PROJECT}" ]]; then
  echo "Setting gcloud project to ${GCP_PROJECT}"
  gcloud config set project "${GCP_PROJECT}"
fi

if [[ -z "${TS_AUTHKEY}" ]]; then
  echo "ERROR: TS_AUTHKEY_EPHEMERAL not set in .env" >&2; exit 1
fi

if ! curl -sf -u "${AUTH}" "${ES_URL}/_cluster/health" >/dev/null 2>&1; then
  echo "ERROR: Elasticsearch not reachable at ${ES_URL}" >&2; exit 1
fi
echo "  ES: OK"

if ! curl -sf -u "${AUTH}" "${KIBANA_URL}/api/status" >/dev/null 2>&1; then
  echo "  Kibana: WARNING - not reachable (will retry later)"
else
  echo "  Kibana: OK"
fi

echo "  GCP Project: ${GCP_PROJECT}"
echo "  Zone: ${GCP_ZONE}"
echo "  Agent Version: ${AGENT_VERSION}"
echo "  Tailscale hostname: ${TS_HOSTNAME}"
echo ""

# ── Step 1: Seed CVE data ───────────────────────────────────────────────
echo "=== Step 1: Seed CVE data ==="
ES_URL="${ES_URL}" bash "${SCRIPT_DIR}/seed_cve_data.sh"
echo ""

# ── Step 2: Configure Fleet ─────────────────────────────────────────────
echo "=== Step 2: Configure Fleet ==="
FLEET_OUTPUT=$(KIBANA_URL="${KIBANA_URL}" ES_URL="${ES_URL}" bash "${SCRIPT_DIR}/configure_fleet.sh")
echo "${FLEET_OUTPUT}"

FLEET_POLICY_ID=$(echo "${FLEET_OUTPUT}" | grep "Agent Policy ID:" | awk '{print $NF}')
FLEET_ENROLLMENT_TOKEN=$(echo "${FLEET_OUTPUT}" | grep "Enrollment Token:" | awk '{print $NF}')

if [[ -z "${FLEET_POLICY_ID}" || -z "${FLEET_ENROLLMENT_TOKEN}" ]]; then
  echo "ERROR: Failed to get Fleet policy ID or enrollment token" >&2
  exit 1
fi
echo ""

# ── Step 3: Create GCP VMs ──────────────────────────────────────────────
echo "=== Step 3: Creating GCP VMs ==="

create_vm() {
  local vm_name="$1"
  local image_spec="${VM_IMAGES[$vm_name]}"
  local image_family="${image_spec%%:*}"
  local image_project="${image_spec##*:}"
  local role="agent"

  if [[ "${vm_name}" == *"fleet-server"* ]]; then
    role="fleet-server"
  fi

  echo "Creating ${vm_name} (${image_family}, role=${role})..."

  # Write Tailscale key to a temp file to avoid it appearing in gcloud command history.
  # NOTE: The key is still visible in VM metadata (GCP console / API). Use ephemeral
  # keys that auto-expire, and delete VMs promptly via teardown_demo.sh.
  local ts_meta_file
  ts_meta_file=$(mktemp)
  echo "${TS_AUTHKEY}" > "${ts_meta_file}"

  gcloud compute instances create "${vm_name}" \
    --project="${GCP_PROJECT}" \
    --zone="${GCP_ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family="${image_family}" \
    --image-project="${image_project}" \
    --boot-disk-size=20GB \
    --labels="${LABEL}" \
    --metadata="vm-role=${role},fleet-url=${FLEET_URL},enrollment-token=${FLEET_ENROLLMENT_TOKEN},es-host=${ES_HOST},agent-version=${AGENT_VERSION}" \
    --metadata-from-file="startup-script=${SCRIPT_DIR}/provision_vm.sh,ts-authkey=${ts_meta_file}" \
    --scopes=default \
    --quiet 2>&1 || echo "  WARNING: VM ${vm_name} may already exist"

  rm -f "${ts_meta_file}"
}

# Create Fleet Server first, then agents
create_vm "vuln-demo-fleet-server"

echo "Waiting for Fleet Server VM to bootstrap (polling Tailscale reachability)..."
FS_READY=false
for i in $(seq 1 30); do
  if curl -fsSk "https://vuln-demo-fleet-server:8220/api/status" >/dev/null 2>&1 || \
     curl -fsSk "${FLEET_URL}/api/status" >/dev/null 2>&1; then
    echo "Fleet Server is responding!"
    FS_READY=true
    break
  fi
  echo "  attempt ${i}/30 - waiting 20s..."
  sleep 20
done
if [[ "${FS_READY}" != "true" ]]; then
  echo "WARNING: Fleet Server not yet responding, proceeding anyway (agents will retry)"
fi

for vm_name in vuln-demo-1 vuln-demo-2 vuln-demo-3 vuln-demo-4 vuln-demo-5; do
  create_vm "${vm_name}" &
done
wait
echo "All agent VM creation commands completed."

echo ""
echo "All VMs created. Agents will take 2-5 minutes to enroll."
echo ""

# ── Step 4: Wait for agents ─────────────────────────────────────────────
echo "=== Step 4: Waiting for agents to check in ==="
for i in $(seq 1 30); do
  AGENT_COUNT=$(curl -sf -u "${AUTH}" \
    "${KIBANA_URL}/api/fleet/agents?kuery=policy_id:${FLEET_POLICY_ID}" \
    -H "kbn-xsrf: true" 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    online = [a for a in d.get('items', d.get('list', [])) if a.get('status') == 'online']
    print(len(online))
except: print(0)
" 2>/dev/null || echo "0")

  echo "  Online agents: ${AGENT_COUNT}/5 (attempt ${i}/30)"
  if [[ "${AGENT_COUNT}" -ge 5 ]]; then
    echo "All 5 agents are online!"
    break
  fi
  sleep 20
done

echo ""

# ── Step 5: Create detection rules ──────────────────────────────────────
echo "=== Step 5: Creating detection rules ==="
FLEET_POLICY_ID="${FLEET_POLICY_ID}" \
  KIBANA_URL="${KIBANA_URL}" \
  bash "${SCRIPT_DIR}/create_rules.sh"
echo ""

# ── Step 6: Summary ─────────────────────────────────────────────────────
cat <<EOF
================================================================
  VULNERABILITY CHECKER E2E DEMO - SETUP COMPLETE
================================================================

  GCP Project:        ${GCP_PROJECT}
  VMs:                6 (1 Fleet Server + 5 agents)
  Agent Policy:       vuln-demo-agents (${FLEET_POLICY_ID})
  CVE Index:          .security-vulnerability-cve-default
  Fleet Server:       ${FLEET_URL}
  ES:                 ${ES_URL}
  Kibana:             ${KIBANA_URL}

  Next steps:
  1. Wait 5-10 minutes for the first rule execution
  2. Run: bash ${SCRIPT_DIR}/verify_demo.sh
  3. Open Kibana > Security > Vulnerability Posture
  4. Check Security > Alerts for vulnerability_check alerts

  Cleanup:
    bash ${SCRIPT_DIR}/teardown_demo.sh
================================================================
EOF
