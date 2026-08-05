#!/usr/bin/env bash
# Run Kibana once during a River image build so optimizer bundles,
# Elasticsearch indices, and Fleet setup are captured in the prepared image.
# Mise completes system setup and bootstrap before invoking this script.

set -euo pipefail

KIBANA_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KIBANA_ROOT"

cleanup() {
  echo "Stopping warmup services..."
  if [[ -n "${KIBANA_PID:-}" ]]; then
    kill "$KIBANA_PID" 2>/dev/null || true
  fi
  if [[ -n "${ELASTICSEARCH_PID:-}" ]]; then
    kill "$ELASTICSEARCH_PID" 2>/dev/null || true
  fi

  # The commands above can leave child processes behind after their parent
  # exits, particularly the optimizer and Elasticsearch JVM.
  pkill -f 'org.elasticsearch.bootstrap' 2>/dev/null || true
  pkill -f 'scripts/kibana' 2>/dev/null || true
  pkill -f 'kbn-optimizer' 2>/dev/null || true
  sleep 3
  pkill -9 -f 'org.elasticsearch.bootstrap' 2>/dev/null || true
  pkill -9 -f 'scripts/kibana' 2>/dev/null || true
}
trap cleanup EXIT

# River runs this task as root while runtime work happens as the agent user.
# A permissive umask keeps generated caches reusable after River re-owns the
# workspace at the end of image preparation.
umask 0022

export LANG=en_US.UTF-8
export LANGUAGE=en_US:en
export LC_ALL=en_US.UTF-8
export DISPLAY=:99
export TEST_BROWSER_BINARY_PATH=/usr/bin/chromium
export TEST_CHROMEDRIVER_PATH=/usr/bin/chromedriver

if ! pgrep -f 'Xvfb :99' >/dev/null 2>&1; then
  Xvfb :99 -screen 0 1920x1080x24 >/tmp/river-kibana-xvfb.log 2>&1 &
fi

echo "=== Starting Elasticsearch ==="
yarn es snapshot >target/river-elasticsearch-warmup.log 2>&1 &
ELASTICSEARCH_PID=$!

for attempt in $(seq 1 60); do
  if curl -sf -u elastic:changeme http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "Elasticsearch is ready"
    break
  fi
  if ! kill -0 "$ELASTICSEARCH_PID" 2>/dev/null; then
    echo "ERROR: Elasticsearch exited during warmup" >&2
    tail -100 target/river-elasticsearch-warmup.log >&2 || true
    exit 1
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "ERROR: Elasticsearch did not become ready within 120 seconds" >&2
    tail -100 target/river-elasticsearch-warmup.log >&2 || true
    exit 1
  fi
  sleep 2
done

echo "=== Starting Kibana ==="
yarn start --no-base-path --server.host=0.0.0.0 >target/river-kibana-warmup.log 2>&1 &
KIBANA_PID=$!

for attempt in $(seq 1 120); do
  status="$(curl -sf http://localhost:5601/api/status 2>/dev/null || true)"
  if grep -q '"available"' <<<"$status"; then
    # Exercise the login route too; this matches the old Ona prebuild and
    # ensures its server-side assets have been loaded before imaging.
    curl -sf -o /dev/null http://localhost:5601/login
    echo "Kibana is available; River prebuild warmup is complete"
    exit 0
  fi
  if ! kill -0 "$KIBANA_PID" 2>/dev/null; then
    echo "ERROR: Kibana exited during warmup" >&2
    tail -100 target/river-kibana-warmup.log >&2 || true
    exit 1
  fi
  if [[ "$attempt" -eq 120 ]]; then
    echo "ERROR: Kibana did not become available within 600 seconds" >&2
    tail -100 target/river-kibana-warmup.log >&2 || true
    exit 1
  fi
  sleep 5
done
