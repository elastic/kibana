#!/usr/bin/env bash

set -euo pipefail

EVAL_SUITE_ID="${EVAL_SUITE_ID:-}"
if [[ -z "$EVAL_SUITE_ID" ]]; then
  echo "EVAL_SUITE_ID is required"
  exit 1
fi

# Ensure a stable run id across steps/jobs in the same Buildkite build.
# If unset, Scout will generate a random run id when Playwright loads configs,
# which makes it hard to correlate results across suites and connectors.
if [[ -z "${TEST_RUN_ID:-}" ]] && [[ -n "${BUILDKITE_BUILD_ID:-}" ]]; then
  export TEST_RUN_ID="bk-${BUILDKITE_BUILD_ID}"
fi

# Bootstrap workspace deps + download build artifacts (same setup as FTR/Scout CI steps)
source .buildkite/scripts/steps/functional/common.sh

cleanup() {
  if [[ -n "${SCOUT_PID:-}" ]]; then
    kill "$SCOUT_PID" 2>/dev/null || true
  fi
  if [[ -n "${FANOUT_PIPELINE_FILE:-}" ]]; then
    rm -f "$FANOUT_PIPELINE_FILE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Fan out into one Buildkite step per connector project when requested.
# This is the only practical way to run all connector projects within the 1h job timeout.
EVAL_FANOUT="${EVAL_FANOUT:-}"
EVAL_PROJECT="${EVAL_PROJECT:-}"
EVAL_FANOUT_CONCURRENCY="${EVAL_FANOUT_CONCURRENCY:-4}"

if [[ "${EVAL_FANOUT:-}" == "1" ]] && [[ -z "${EVAL_PROJECT:-}" ]]; then
  if ! command -v buildkite-agent >/dev/null 2>&1; then
    echo "EVAL_FANOUT=1 requires buildkite-agent; falling back to running all projects in-process"
  else
    CONNECTOR_IDS="$(node x-pack/platform/packages/shared/kbn-evals/scripts/ci/get_connector_ids.js)"

    if [[ -z "${CONNECTOR_IDS:-}" ]]; then
      echo "No connectors found in KIBANA_TESTING_AI_CONNECTORS; falling back to evaluation connector only"
      if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]]; then
        export EVAL_PROJECT="${EVALUATION_CONNECTOR_ID}"
      fi
    else
      echo "--- Uploading eval connector fanout steps"

      # Buildkite YAML fragment (steps only) uploaded dynamically.
      # NOTE: we re-invoke this script with EVAL_FANOUT=0 and EVAL_PROJECT=<connector-id>
      # to avoid recursive fanout.
      group_key_safe="$(printf '%s' "$EVAL_SUITE_ID" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/^-|-$//g')"

      # NOTE: Avoid building YAML via command substitution, because it strips trailing newlines.
      # That can accidentally concatenate lines (producing invalid YAML) when appending blocks.
      FANOUT_PIPELINE_FILE="$(mktemp -t kbn-evals-fanout.XXXXXX.yml)"
      cat >"$FANOUT_PIPELINE_FILE" <<EOF
steps:
  - group: "LLM Evals: ${EVAL_SUITE_ID}"
    key: "kbn-evals-${group_key_safe}-fanout"
    steps:
EOF

      while IFS= read -r connector_id; do
        [[ -z "$connector_id" ]] && continue
        key_safe="$(printf '%s' "$connector_id" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/^-|-$//g')"

        # Default BK step timeout is 120m to allow slower models/suites without
        # needing per-suite/per-model special-casing. Can be overridden if needed.
        timeout_in_minutes="${EVAL_STEP_TIMEOUT_IN_MINUTES:-120}"

        cat >>"$FANOUT_PIPELINE_FILE" <<EOF
      - label: "${connector_id}"
        key: "kbn-evals-${group_key_safe}-${key_safe}"
        command: "bash .buildkite/scripts/steps/evals/run_suite.sh"
        env:
          KBN_EVALS: "1"
          EVAL_SUITE_ID: "${EVAL_SUITE_ID}"
          EVAL_PROJECT: "${connector_id}"
          EVAL_FANOUT: "0"
          TEST_RUN_ID: "${TEST_RUN_ID:-}"
        timeout_in_minutes: ${timeout_in_minutes}
        concurrency_group: "kbn-evals-${group_key_safe}"
        concurrency: ${EVAL_FANOUT_CONCURRENCY}
        agents:
          machineType: n2-standard-8
          preemptible: true
        retry:
          automatic:
            - exit_status: "-1"
              limit: 3
EOF
      done <<<"$CONNECTOR_IDS"

      if ! buildkite-agent pipeline upload "$FANOUT_PIPELINE_FILE"; then
        echo "Fanout pipeline upload failed. Dumping generated YAML with line numbers:"
        nl -ba "$FANOUT_PIPELINE_FILE" || true
        exit 1
      fi
      echo "Fanout uploaded. Exiting parent step."
      exit 0
    fi
  fi
fi

# Start Scout server in background (run Kibana from the distributable)
SCOUT_SERVER_ARGS=(start-server --location local --arch stateful --domain classic --kibanaInstallDir "${KIBANA_BUILD_LOCATION:?}")
if [[ -n "${TRACING_EXPORTERS:-}" ]]; then
  SCOUT_SERVER_ARGS+=(--serverConfigSet evals_tracing)
fi
node scripts/scout "${SCOUT_SERVER_ARGS[@]}" &
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

# Run eval suite via @kbn/evals CLI (internal executor by default).
# If EVAL_PROJECT is set, run a single Playwright project (used by CI fanout steps).
# Otherwise, Playwright will run all projects defined by the suite config (useful locally).
if [[ -n "${EVAL_PROJECT:-}" ]]; then
  node scripts/evals run --suite "$EVAL_SUITE_ID" --project "$EVAL_PROJECT"
else
  node scripts/evals run --suite "$EVAL_SUITE_ID"
fi

