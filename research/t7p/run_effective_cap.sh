#!/bin/bash
# resourceLimits can bind only when the parent has no --max-old-space-size.
# The image sets ELASTIC_CONTAINER=true, and bin/kibana then injects 75% of the
# cgroup. ELASTIC_CONTAINER=false is the only image check for that injection.
# A raw node entrypoint skips kibana-docker and stayed at HTTP 503. Not production shape.
set -euo pipefail
cd /Users/jloleysens/repos/work/kibana-t7-7.p-kit

B=/Users/jloleysens/.agentic-work/projects/kibana/workload-isolation-research
EVIDENCE="$B/tracks/track-7/7.P-kit/evidence/prod-shape"
PREREG="${T7P_PREREG_FILE:-$EVIDENCE/prereg-007.json}"
OUT="${T7P_OUT_FILE:-$EVIDENCE/t7p-prod-shape-mem-007.json}"
DOCKER_MEMORY="${T7P_DOCKER_MEMORY:-2g}"
MOUNT="$EVIDENCE/phase-mount"
IMAGE="${T7P_IMAGE:-docker.elastic.co/kibana-ci/kibana-serverless:9.6.0}"
LIMIT_DIR="$EVIDENCE/runtime-limits"
KEY_FILE=/tmp/t7p-wc/dist-keys.env

if [[ ! -f "$PREREG" ]]; then
  echo "missing prereg" >&2
  exit 1
fi
if [[ "${T7P_EXTERNAL_LOCK:-}" != "1" ]]; then
  echo "boot only via with_bench_lock.sh (T7P_EXTERNAL_LOCK=1)" >&2
  exit 2
fi

cleanup() {
  docker logs t7p-prod-shape 2>&1 \
    | sed -E 's/[A-Za-z0-9+/=_-]{40,}/[redacted]/g' \
    | grep -viE 'encryptionkey|serviceaccounttoken|authorization:|bearer ' \
    | tail -120 > "$EVIDENCE/mem-007-boot.log" || true
  docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
}
trap cleanup EXIT

# shellcheck disable=SC1090
source "$KEY_FILE"
TOKEN="$(python3 -c 'import json; print(json.load(open("/tmp/t7p-wc/token-resp.json"))["token"]["value"])')"
mkdir -p "$LIMIT_DIR"
cp research/t7p/worker_limits.cjs "$LIMIT_DIR/worker_limits.cjs"
printf '%s\n' '{}' > "$LIMIT_DIR/limits.json"

node research/t7p/patch_phase_probe.mjs "$MOUNT"
grep -q "readinessCache" "$MOUNT/policies.js"
grep -q "heapSizeLimit" "$MOUNT/memory_sample.js"

docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
docker run -d --name t7p-prod-shape \
  --memory="$DOCKER_MEMORY" --memory-swap="$DOCKER_MEMORY" --cpus=2 \
  -p 5681:5601 \
  --add-host=host.docker.internal:host-gateway \
  -v "$LIMIT_DIR:/t7p:ro" \
  -v "$MOUNT/policies.js:/usr/share/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/capability_kit/worker_core/policies.js:ro" \
  -v "$MOUNT/memory_sample.js:/usr/share/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/capability_kit/worker_core/memory_sample.js:ro" \
  -e ELASTIC_CONTAINER=false \
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
  -e NODE_OPTIONS='--require /t7p/worker_limits.cjs' \
  "$IMAGE" >/dev/null

export T7P_PREREG="$PREREG" T7P_OUT="$OUT" T7P_LIMITS_HOST="$LIMIT_DIR/limits.json"
node research/t7p/cap_sweep.mjs effective
echo "effective done"
