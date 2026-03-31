#!/usr/bin/env bash
# VM startup script for the vulnerability checker E2E demo.
# Passed to GCP VMs via --metadata-from-file startup-script=provision_vm.sh
#
# Expected metadata keys (set by setup_e2e_demo.sh):
#   vm-role           : fleet-server | agent
#   ts-authkey        : Tailscale ephemeral auth key
#   fleet-url         : Fleet Server URL (Tailscale hostname)
#   enrollment-token  : Fleet enrollment token
#   es-host           : Elasticsearch host (Tailscale hostname)
#   agent-version     : Elastic Agent version to install
set -euo pipefail

LOGFILE="/var/log/vuln-demo-provision.log"
exec > >(tee -a "$LOGFILE") 2>&1

echo "=== Vulnerability Demo VM Provisioning ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

metadata_url="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
meta() { curl -sf -H "Metadata-Flavor: Google" "${metadata_url}/$1" 2>/dev/null || echo ""; }

VM_ROLE=$(meta vm-role)
TS_AUTHKEY=$(meta ts-authkey)
FLEET_URL=$(meta fleet-url)
ENROLLMENT_TOKEN=$(meta enrollment-token)
ES_HOST=$(meta es-host)
AGENT_VERSION=$(meta agent-version)

VM_NAME=$(hostname)
echo "VM Role:       ${VM_ROLE}"
echo "VM Name:       ${VM_NAME}"
echo "Agent Version: ${AGENT_VERSION}"

export DEBIAN_FRONTEND=noninteractive

# ── 1. System update + Tailscale ─────────────────────────────────────────
echo "--- Updating packages and installing Tailscale ---"
apt-get update -qq
apt-get install -y -qq curl jq python3

curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey="${TS_AUTHKEY}" --hostname="${VM_NAME}" --accept-routes --ssh
echo "Tailscale IP: $(tailscale ip -4)"

# ── 2. Install deliberately vulnerable packages (agents only) ────────────
if [[ "${VM_ROLE}" != "fleet-server" ]]; then
  echo "--- Keeping existing OS packages as vulnerable baseline ---"
  echo "Installed deb_packages will be reported by osquery as-is."
  echo "The OS images ship with known-vulnerable versions of:"
  echo "  curl, openssl/libssl, bash, sudo, zlib1g, etc."
  dpkg-query -W -f '${Package} ${Version}\n' curl openssl libssl1.1 libssl3 bash sudo zlib1g 2>/dev/null || true
fi

# ── 3. Download Elastic Agent ────────────────────────────────────────────
cd /opt
echo "--- Downloading Elastic Agent ${AGENT_VERSION} ---"

AGENT_TAR="elastic-agent-${AGENT_VERSION}-linux-x86_64.tar.gz"
AGENT_DIR="elastic-agent-${AGENT_VERSION}-linux-x86_64"
RELEASE_URL="https://artifacts.elastic.co/downloads/beats/elastic-agent/${AGENT_TAR}"

if curl -fsSL -o "${AGENT_TAR}" "${RELEASE_URL}" 2>/dev/null; then
  echo "Downloaded release artifact"
else
  echo "Release artifact not found, trying SNAPSHOT..."
  SNAP_TAR="elastic-agent-${AGENT_VERSION}-SNAPSHOT-linux-x86_64.tar.gz"
  SNAP_URL=$(curl -sf "https://artifacts-api.elastic.co/v1/versions/${AGENT_VERSION}-SNAPSHOT/builds/latest" \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
pkgs = d.get('build',{}).get('projects',{}).get('elastic-agent-package',{}).get('packages',{})
print(pkgs.get('${SNAP_TAR}',{}).get('url',''))" 2>/dev/null || true)

  if [[ -z "${SNAP_URL}" ]]; then
    echo "ERROR: Could not resolve SNAPSHOT URL for ${AGENT_VERSION}" >&2
    exit 1
  fi
  echo "Downloading from: ${SNAP_URL}"
  curl -fsSL -o "${SNAP_TAR}" "${SNAP_URL}"
  AGENT_TAR="${SNAP_TAR}"
  AGENT_DIR="elastic-agent-${AGENT_VERSION}-SNAPSHOT-linux-x86_64"
fi

tar xzf "${AGENT_TAR}"
cd "${AGENT_DIR}"

# ── 4. Role-specific enrollment ──────────────────────────────────────────
if [[ "${VM_ROLE}" == "fleet-server" ]]; then
  echo "--- Installing as Fleet Server ---"

  # Wait for ES to be reachable via Tailscale
  echo "Waiting for Elasticsearch at ${ES_HOST}..."
  for i in $(seq 1 60); do
    if curl -fsSk -u "elastic:changeme" "${ES_HOST}/_cluster/health" >/dev/null 2>&1; then
      echo "Elasticsearch is reachable"
      break
    fi
    if [[ "${i}" -eq 60 ]]; then
      echo "ERROR: Elasticsearch not reachable after 10 minutes" >&2
      exit 1
    fi
    echo "  attempt ${i}/60 - waiting 10s..."
    sleep 10
  done

  ./elastic-agent install -f \
    --fleet-server-es="${ES_HOST}" \
    --fleet-server-es-insecure \
    --fleet-server-policy="fleet-server-policy" \
    --fleet-server-port=8220

  echo "Fleet Server installed and running"

else
  echo "--- Installing Elastic Agent (${VM_ROLE}) ---"

  # Wait for Fleet Server to be reachable via Tailscale
  echo "Waiting for Fleet Server at ${FLEET_URL}..."
  FLEET_READY=false
  for i in $(seq 1 90); do
    if curl -fsSk "${FLEET_URL}/api/status" >/dev/null 2>&1; then
      echo "Fleet Server is reachable"
      FLEET_READY=true
      break
    fi
    echo "  attempt ${i}/90 - waiting 10s..."
    sleep 10
  done

  if [[ "${FLEET_READY}" != "true" ]]; then
    echo "ERROR: Fleet Server not reachable after 15 minutes" >&2
    exit 1
  fi

  ./elastic-agent install -f \
    --url="${FLEET_URL}" \
    --enrollment-token="${ENROLLMENT_TOKEN}" \
    --insecure

  echo "Elastic Agent installed and enrolled"
fi

echo "=== Provisioning complete at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
