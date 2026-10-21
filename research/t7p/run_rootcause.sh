#!/bin/bash
# Locked 4 GiB timing + warm re-entry. Local cgroup emulation, not a fit verdict.
# Holds bench.lock only while the container is up. Does not print tokens.
set -euo pipefail
cd /Users/jloleysens/repos/work/kibana-t7-7.p-kit

B=/Users/jloleysens/.agentic-work/projects/kibana/workload-isolation-research
LOCK="$B/bench.lock"
EVIDENCE="$B/tracks/track-7/7.P-kit/evidence/prod-shape"
PREREG="$EVIDENCE/prereg-003.json"
OUT="$EVIDENCE/t7p-prod-shape-mem-003.json"
IMAGE="${T7P_IMAGE:-docker.elastic.co/kibana-ci/kibana-serverless:9.6.0}"
LIMIT_DIR="$EVIDENCE/runtime-limits"
KEY_FILE=/tmp/t7p-wc/dist-keys.env

if [[ ! -f "$PREREG" ]]; then
  echo "missing prereg" >&2
  exit 1
fi

acquired=0
for _ in $(seq 1 180); do
  if mkdir "$LOCK" 2>/dev/null; then
    acquired=1
    break
  fi
  echo "waiting for bench.lock"
  sleep 10
done
if [[ "$acquired" -ne 1 ]]; then
  echo "bench.lock still held" >&2
  exit 1
fi
echo "7.P mem-003 pid=$$ $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LOCK/owner"

cleanup() {
  docker logs t7p-prod-shape 2>&1 \
    | sed -E 's/[A-Za-z0-9+/=_-]{40,}/[redacted]/g' \
    | grep -viE 'encryptionkey|serviceaccounttoken|authorization:|bearer ' \
    | tail -80 > "$EVIDENCE/mem-003-boot.log" || true
  docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
  rm -f "$LOCK/owner"
  rmdir "$LOCK" 2>/dev/null || true
}
trap cleanup EXIT

# shellcheck disable=SC1090
source "$KEY_FILE"
TOKEN="$(python3 -c 'import json; print(json.load(open("/tmp/t7p-wc/token-resp.json"))["token"]["value"])')"
mkdir -p "$LIMIT_DIR"
cp research/t7p/worker_limits.cjs "$LIMIT_DIR/worker_limits.cjs"
printf '%s\n' '{"maxOldGenerationSizeMb":512}' > "$LIMIT_DIR/limits.json"

docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
docker run -d --name t7p-prod-shape \
  --memory=4g --memory-swap=4g --cpus=2 \
  -p 5681:5601 \
  --add-host=host.docker.internal:host-gateway \
  -v "$LIMIT_DIR:/t7p:ro" \
  -e KBN_ENABLE_POINTER_COMPRESSION=true \
  -e KBN_ENABLE_JEMALLOC=true \
  -e KBN_DISALLOW_CODE_GEN_FROM_STRINGS=false \
  -e KBN_RESEARCH_T7A=true \
  -e KBN_RESEARCH_CAPABILITY_KIT=true \
  -e NODE_ROLES='["background_tasks"]' \
  -e SERVER_HOST=0.0.0.0 \
  -e SERVER_PORT=5601 \
  -e ELASTICSEARCH_HOSTS='["http://host.docker.internal:9281"]' \
  -e ELASTICSEARCH_SERVICEACCOUNTTOKEN="$TOKEN" \
  -e XPACK_SECURITY_ENCRYPTIONKEY="$KEY" \
  -e XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY="$KEY" \
  -e XPACK_REPORTING_ENCRYPTIONKEY="$KEY" \
  -e XPACK_ACTIONS_PRECONFIGUREDALERTALLOWEDHOSTS='["*"]' \
  -e T7P_WORKER_LIMITS_FILE=/t7p/limits.json \
  -e NODE_OPTIONS='--max-old-space-size=3277 --require /t7p/worker_limits.cjs' \
  "$IMAGE" >/dev/null

export T7P_PREREG="$PREREG" T7P_OUT="$OUT" T7P_LIMITS_HOST="$LIMIT_DIR/limits.json"
node research/t7p/cap_sweep.mjs rootcause
echo "rootcause done"
