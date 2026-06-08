#!/usr/bin/env bash
# Starts Elasticsearch and Kibana, waits for Kibana to become available,
# then stops both. Run during the devcontainer prebuild so all one-time
# initialization (optimizer bundles, Chromium, ES indices, fleet setup)
# is cached in the workspace before the first real use.

set -euo pipefail

KIBANA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  echo "Stopping services..."
  pkill -f 'org.elasticsearch.bootstrap' 2>/dev/null || true
  pkill -f 'scripts/kibana' 2>/dev/null || true
  pkill -f 'kbn-optimizer' 2>/dev/null || true
  # Give processes a moment to exit
  sleep 3
  # Force-kill anything remaining
  pkill -9 -f 'org.elasticsearch.bootstrap' 2>/dev/null || true
  pkill -9 -f 'scripts/kibana' 2>/dev/null || true
}

trap cleanup EXIT

cd "$KIBANA_ROOT"

echo "=== Bootstrapping ==="
yarn kbn bootstrap

# Fail fast if bootstrap did not actually populate node_modules / link the
# @kbn/* workspaces. Otherwise the prebuild would snapshot a broken tree and
# the first real start fails with "Cannot find module '@kbn/setup-node-env'".
echo "=== Verifying bootstrap linked workspaces ==="
if ! node -e "require.resolve('@kbn/setup-node-env')" 2>/dev/null; then
  echo "ERROR: bootstrap did not link workspaces (@kbn/setup-node-env unresolved)"
  exit 1
fi
echo "Workspaces linked"

echo "=== Starting Elasticsearch ==="
yarn es snapshot &

echo "Waiting for Elasticsearch to be ready..."
for i in $(seq 1 60); do
  if curl -sf -u elastic:changeme http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "Elasticsearch ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Elasticsearch did not start within 120s"
    exit 1
  fi
  sleep 2
done

echo "=== Starting Kibana ==="
yarn start --no-base-path --server.host=0.0.0.0 &

echo "Waiting for Kibana to be available..."
for i in $(seq 1 120); do
  STATUS=$(curl -sf http://localhost:5601/api/status 2>/dev/null || echo "")
  if echo "$STATUS" | grep -q '"available"'; then
    echo "Kibana is available — warmup complete"
    exit 0
  fi
  if [ "$i" -eq 120 ]; then
    echo "ERROR: Kibana did not become available within 600s"
    exit 1
  fi
  sleep 5
done
