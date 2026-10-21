#!/bin/bash
# Warm alerting dispatch phases. Local cgroup emulation.
# The caller holds bench.lock via with_bench_lock.sh. Does not print tokens.
set -euo pipefail
cd /Users/jloleysens/repos/work/kibana-t7-7.p-kit

B=/Users/jloleysens/.agentic-work/projects/kibana/workload-isolation-research
EVIDENCE="$B/tracks/track-7/7.P-kit/evidence/prod-shape"
PREREG="${T7P_PREREG_FILE:-$EVIDENCE/prereg-005.json}"
OUT="${T7P_OUT_FILE:-$EVIDENCE/t7p-prod-shape-mem-005.json}"
DOCKER_MEMORY="${T7P_DOCKER_MEMORY:-4g}"
TAG="${T7P_TAG:-mem-005}"
IMAGE="${T7P_IMAGE:-docker.elastic.co/kibana-ci/kibana-serverless:9.6.0}"
MOUNT="$EVIDENCE/phase-mount"
KEY_FILE=/tmp/t7p-wc/dist-keys.env
PLUGIN=/usr/share/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/t7a
KIT=/usr/share/kibana/node_modules/@kbn/workload-isolation-research-plugin/server/capability_kit

if [[ ! -f "$PREREG" ]]; then
  echo "missing prereg" >&2
  exit 1
fi

if [[ "${T7P_EXTERNAL_LOCK:-}" != "1" ]]; then
  echo "boot only via with_bench_lock.sh (T7P_EXTERNAL_LOCK=1)" >&2
  exit 2
fi

node research/t7p/patch_phase_probe.mjs "$MOUNT"
grep -q "phase === 'phases'" "$MOUNT/entry.js"
grep -q "kind === 'phases'" "$MOUNT/main_host.js"
grep -q "literal('phases')" "$MOUNT/routes.js"
grep -q "readinessCache" "$MOUNT/policies.js"
grep -q "heapSizeLimit" "$MOUNT/memory_sample.js"

cleanup() {
  docker inspect -f 'status={{.State.Status}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' t7p-prod-shape \
    > "$EVIDENCE/$TAG-inspect.txt" 2>/dev/null || echo 'status=missing' > "$EVIDENCE/$TAG-inspect.txt"
  docker logs t7p-prod-shape 2>&1 \
    | sed -E 's/[A-Za-z0-9+/=_-]{40,}/[redacted]/g' \
    | grep -viE 'encryptionkey|serviceaccounttoken|authorization:|bearer ' \
    | tail -200 > "$EVIDENCE/$TAG-boot.log" || true
  docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
}
trap cleanup EXIT

# shellcheck disable=SC1090
source "$KEY_FILE"
TOKEN="$(python3 -c 'import json; print(json.load(open("/tmp/t7p-wc/token-resp.json"))["token"]["value"])')"

docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
docker run -d --name t7p-prod-shape \
  --memory="$DOCKER_MEMORY" --memory-swap="$DOCKER_MEMORY" --cpus=2 \
  -p 5681:5601 \
  --add-host=host.docker.internal:host-gateway \
  -v "$MOUNT/entry.js:$PLUGIN/isolate/entry.js:ro" \
  -v "$MOUNT/main_host.js:$PLUGIN/main_host.js:ro" \
  -v "$MOUNT/routes.js:$PLUGIN/routes.js:ro" \
  -v "$MOUNT/policies.js:$KIT/worker_core/policies.js:ro" \
  -v "$MOUNT/memory_sample.js:$KIT/worker_core/memory_sample.js:ro" \
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
  -e NODE_OPTIONS='--max-old-space-size=3277' \
  "$IMAGE" >/dev/null

export T7P_PREREG="$PREREG" T7P_OUT="$OUT"
node research/t7p/cap_sweep.mjs phases
echo "phases done"
