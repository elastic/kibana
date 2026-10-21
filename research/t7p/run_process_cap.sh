#!/bin/bash
# Process-transport child --max-old-space-size sweep. Parent keeps the production flag.
# LOCAL CGROUP EMULATION. The caller holds bench.lock for this one cgroup.
set -euo pipefail
cd /Users/jloleysens/repos/work/kibana-t7-7.p-kit

B=/Users/jloleysens/.agentic-work/projects/kibana/workload-isolation-research
EVIDENCE="$B/tracks/track-7/7.P-kit/evidence/prod-shape"
PREREG="${T7P_PREREG_FILE:-$EVIDENCE/prereg-008.json}"
DOCKER_MEMORY="${T7P_DOCKER_MEMORY:-2g}"
PARENT_OLD="${T7P_PARENT_OLD_SPACE:-1638}"
TAG="${T7P_TAG:-2g}"
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
grep -q "readinessCache" "$MOUNT/policies.js"
grep -q "T7P_PROCESS_OLD_SPACE_MB" "$MOUNT/transport.js"
grep -q "heapSizeLimit" "$MOUNT/memory_sample.js"

cleanup() {
  docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
}
trap cleanup EXIT

# shellcheck disable=SC1090
source "$KEY_FILE"
TOKEN="$(python3 -c 'import json; print(json.load(open("/tmp/t7p-wc/token-resp.json"))["token"]["value"])')"

boot_one() {
  local cap="$1"
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
    -v "$MOUNT/transport.js:$KIT/transport.js:ro" \
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
    -e "T7P_PROCESS_OLD_SPACE_MB=$cap" \
    -e "NODE_OPTIONS=--max-old-space-size=$PARENT_OLD" \
    "$IMAGE" >/dev/null
}

for cap in 256 384 512; do
  echo "process cap $cap cgroup $DOCKER_MEMORY parent $PARENT_OLD"
  boot_one "$cap"
  export T7P_PREREG="$PREREG"
  export T7P_OUT="$EVIDENCE/t7p-prod-shape-mem-008-${TAG}-${cap}.json"
  export T7P_TRANSPORT=process
  export T7P_PROCESS_OLD_SPACE_MB="$cap"
  export T7P_COLD_N=20
  set +e
  node research/t7p/cap_sweep.mjs process
  echo "cap=$cap node_exit=$?"
  set -e
  docker inspect -f 'status={{.State.Status}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' t7p-prod-shape \
    > "$EVIDENCE/mem-008-${TAG}-${cap}-inspect.txt" 2>/dev/null || echo 'status=missing' > "$EVIDENCE/mem-008-${TAG}-${cap}-inspect.txt"
  docker logs t7p-prod-shape 2>&1 \
    | sed -E 's/[A-Za-z0-9+/=_-]{40,}/[redacted]/g' \
    | grep -viE 'encryptionkey|serviceaccounttoken|authorization:|bearer ' \
    | tail -80 > "$EVIDENCE/mem-008-${TAG}-${cap}-boot.log" || true
  docker rm -f t7p-prod-shape >/dev/null 2>&1 || true
done
echo "process sweep done $TAG"
