#!/usr/bin/env bash

set -euo pipefail

EVAL_SUITE_ID="${EVAL_SUITE_ID:-}"
if [[ -z "$EVAL_SUITE_ID" ]]; then
  echo "EVAL_SUITE_ID is required"
  exit 1
fi

# Bootstrap workspace deps + download build artifacts (same setup as FTR/Scout CI steps)
source .buildkite/scripts/steps/functional/common.sh

cleanup() {
  if [[ -n "${SCOUT_PID:-}" ]]; then
    kill "$SCOUT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Start Scout server in background (run Kibana from the distributable)
node scripts/scout start-server --stateful --kibana-install-dir "${KIBANA_BUILD_LOCATION:?}" &
SCOUT_PID=$!

# Wait for Scout to write servers config (and fail fast if the Scout server process exits)
for _ in {1..60}; do
  if [[ -f .scout/servers/local.json ]]; then
    break
  fi
  if ! kill -0 "$SCOUT_PID" 2>/dev/null; then
    echo "Scout server exited before writing .scout/servers/local.json"
    wait "$SCOUT_PID" || true
    exit 1
  fi
  sleep 1
done

if [[ ! -f .scout/servers/local.json ]]; then
  echo "Timed out waiting for .scout/servers/local.json"
  exit 1
fi

# Wait for Kibana to be ready (and fail fast if the Scout server process exits)
KIBANA_URL="$(jq -r '.hosts.kibana' .scout/servers/local.json)"
KIBANA_URL="$(printf '%s' "$KIBANA_URL" | sed 's:/*$::')"

for _ in {1..180}; do
  if ! kill -0 "$SCOUT_PID" 2>/dev/null; then
    echo "Scout server exited before Kibana became ready"
    wait "$SCOUT_PID" || true
    exit 1
  fi

  if curl -sSf "$KIBANA_URL/api/status" >/dev/null; then
    echo "Kibana is ready at $KIBANA_URL"
    break
  fi

  sleep 5
done

# Run eval suite via @kbn/evals CLI (internal executor by default)
node scripts/evals run --suite "$EVAL_SUITE_ID"

