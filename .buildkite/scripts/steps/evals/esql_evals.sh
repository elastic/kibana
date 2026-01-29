#!/usr/bin/env bash

set -euo pipefail

# Bootstrap workspace deps + download build artifacts (same setup as FTR/Scout CI steps)
source .buildkite/scripts/steps/functional/common.sh

# Write repo-root config with env var placeholders for Phoenix tracing.
# Note: when running Kibana from a distributable (`--kibana-install-dir`), Kibana will NOT read this file.
# The distributable reads `${KIBANA_BUILD_LOCATION}/config/kibana.yml`, which we patch below as well.
mkdir -p config
cat > config/kibana.dev.yml <<'EOF'
telemetry:
  enabled: true
  tracing:
    enabled: true
    exporters:
      - phoenix:
          base_url: '${PHOENIX_BASE_URL}'
          public_url: '${PHOENIX_PUBLIC_URL}'
          project_name: '${PHOENIX_PROJECT_NAME}'
          api_key: '${PHOENIX_API_KEY}'
EOF

# Also apply the Phoenix tracing exporter config to the Kibana distributable.
# When running with `--kibana-install-dir`, Kibana will read config from the install dir,
# not from the repo root `config/kibana.dev.yml`.
KIBANA_CONFIG_FILE="${KIBANA_BUILD_LOCATION:?}/config/kibana.yml"
mkdir -p "$(dirname "$KIBANA_CONFIG_FILE")"
cat >> "$KIBANA_CONFIG_FILE" <<'EOF'

telemetry.tracing.enabled: true
telemetry.tracing.exporters:
  - phoenix:
      base_url: '${PHOENIX_BASE_URL}'
      public_url: '${PHOENIX_PUBLIC_URL}'
      project_name: '${PHOENIX_PROJECT_NAME}'
      api_key: '${PHOENIX_API_KEY}'
EOF

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

# Run ES|QL evaluations
EVALUATION_REPETITIONS="${EVALUATION_REPETITIONS:-1}" \
EVALUATION_CONNECTOR_ID="${EVALUATION_CONNECTOR_ID:-gemini-2-5-pro}" \
TRACING_ES_URL="${TRACING_ES_URL:-}" \
EVALUATIONS_ES_URL="${EVALUATIONS_ES_URL:-}" \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts \
  x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/evals/esql/esql.spec.ts


