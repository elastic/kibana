#!/usr/bin/env bash

set -euo pipefail

# NOTE: Keep this Buildkite *step* script mostly bash + orchestration.
# - If you need non-trivial logic (parsing/transforming JSON, label/model selection, connector merging, etc),
#   put it in a standalone script under `x-pack/platform/packages/shared/kbn-evals/scripts/ci/`
#   and call it from here (see `get_connector_ids.js`, `merge_ai_connectors.js`, `generate_eis_connectors.js`).
# - Avoid inline `node - <<'NODE'` heredocs in this file; ops/reviewers will ask to extract them anyway.

EVAL_SUITE_ID="${EVAL_SUITE_ID:-}"
if [[ -z "$EVAL_SUITE_ID" ]]; then
  echo "EVAL_SUITE_ID is required"
  exit 1
fi

# Tag inference traffic with `X-Elastic-Product-Use-Case` (forwarded from inference connector telemetry).
# The value should be the platform-level `pluginId` use-case identifier.
# `@kbn/evals` defaults this to `kbn_evals`, but you can override via KBN_EVALS_TELEMETRY_PLUGIN_ID.

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

# Optional: extend eval connectors with EIS models (Elastic Inference Service).
# This is intentionally done here (post-bootstrap) so Node scripts can import repo packages if needed.
if [[ "${FTR_EIS_CCM:-}" =~ ^(1|true)$ ]]; then
  NEED_EIS_CONNECTORS="false"
  if [[ "${EVAL_INCLUDE_EIS_MODELS:-}" =~ ^(1|true)$ ]]; then
    NEED_EIS_CONNECTORS="true"
  fi
  # Fanout child steps only need EIS connectors when running an EIS project.
  if [[ -n "${EVAL_PROJECT:-}" ]] && [[ "${EVAL_PROJECT}" == eis-* ]]; then
    NEED_EIS_CONNECTORS="true"
  fi
  # If the judge connector is EIS-backed, we still need EIS connectors even when running a LiteLLM project.
  if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]] && [[ "${EVALUATION_CONNECTOR_ID}" == eis-* ]]; then
    NEED_EIS_CONNECTORS="true"
  fi

  if [[ "${NEED_EIS_CONNECTORS}" == "true" ]]; then
    if [[ -z "${KIBANA_EIS_CCM_API_KEY:-}" ]]; then
      echo "FTR_EIS_CCM was set but KIBANA_EIS_CCM_API_KEY is missing"
      exit 1
    fi

    echo "--- Discovering EIS models for eval connectors"
    node scripts/discover_eis_models.js

    echo "--- Generating EIS connectors"
    EIS_CONNECTORS_B64="$(
      node x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js
    )"

    export EIS_CONNECTORS_B64

    echo "--- Merging LiteLLM + EIS connectors"
    export KIBANA_TESTING_AI_CONNECTORS="$(
      node x-pack/platform/packages/shared/kbn-evals/scripts/ci/merge_ai_connectors.js
    )"
  fi
fi

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
        cancel_on_build_failing: true
        key: "kbn-evals-${group_key_safe}-${key_safe}"
        command: "bash .buildkite/scripts/steps/evals/run_suite.sh"
        env:
          KBN_EVALS: "1"
          FTR_EIS_CCM: "${FTR_EIS_CCM:-}"
          EVAL_INCLUDE_EIS_MODELS: "${EVAL_INCLUDE_EIS_MODELS:-}"
          EVALUATION_CONNECTOR_ID: "${EVALUATION_CONNECTOR_ID:-}"
          EVAL_SUITE_ID: "${EVAL_SUITE_ID}"
          EVAL_PROJECT: "${connector_id}"
          EVAL_FANOUT: "0"
          TEST_RUN_ID: "${TEST_RUN_ID:-}"
        timeout_in_minutes: ${timeout_in_minutes}
        concurrency_group: "kbn-evals-${group_key_safe}"
        concurrency: ${EVAL_FANOUT_CONCURRENCY}
        agents:
          image: family/kibana-ubuntu-2404
          imageProject: elastic-images-prod
          provider: gcp
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
SCOUT_SERVER_ARGS+=(--serverConfigSet evals_tracing)
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

# Enable EIS Cloud Connected Mode (CCM) on the Scout ES cluster so EIS-backed
# inference endpoints are available for `.inference` connectors.
if [[ "${FTR_EIS_CCM:-}" =~ ^(1|true)$ ]]; then
  NEED_EIS_RUNTIME="false"
  if [[ -n "${EVAL_PROJECT:-}" ]] && [[ "${EVAL_PROJECT}" == eis-* ]]; then
    NEED_EIS_RUNTIME="true"
  fi
  if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]] && [[ "${EVALUATION_CONNECTOR_ID}" == eis-* ]]; then
    NEED_EIS_RUNTIME="true"
  fi
  if [[ "${EVAL_MODEL_GROUPS:-}" == *"eis/"* ]]; then
    NEED_EIS_RUNTIME="true"
  fi

  if [[ "${NEED_EIS_RUNTIME}" != "true" ]]; then
    echo "EIS CCM enabled but not required for this run; skipping CCM setup"
  else
    if [[ -z "${KIBANA_EIS_CCM_API_KEY:-}" ]]; then
      echo "FTR_EIS_CCM was set but KIBANA_EIS_CCM_API_KEY is missing"
      exit 1
    fi

    ES_URL="$(jq -r '.hosts.elasticsearch' .scout/servers/local.json | sed 's:/*$::')"

    echo "--- Waiting for Elasticsearch to be ready at $ES_URL"
    ES_READY="false"
    for _ in {1..120}; do
      if ! kill -0 "$SCOUT_PID" 2>/dev/null; then
        echo "Scout server exited before Elasticsearch became ready"
        wait "$SCOUT_PID" || true
        exit 1
      fi

      if curl -sSf -u elastic:changeme \
        "$ES_URL/_cluster/health?wait_for_status=yellow&timeout=1s" >/dev/null; then
        ES_READY="true"
        break
      fi

      sleep 1
    done

    if [[ "${ES_READY}" != "true" ]]; then
      echo "Timed out waiting for Elasticsearch at $ES_URL"
      exit 1
    fi

    echo "--- Enabling EIS Cloud Connected Mode (CCM) on $ES_URL"

    curl -sSf -u elastic:changeme \
      -H 'content-type: application/json' \
      -X PUT "$ES_URL/_inference/_ccm" \
      -d "{\"api_key\":\"${KIBANA_EIS_CCM_API_KEY:?}\"}" >/dev/null

    echo "--- Waiting for EIS inference endpoints"
    for attempt in {1..10}; do
      if curl -sSf -u elastic:changeme "$ES_URL/_inference/_all" \
        | jq -e '.endpoints | any(.task_type=="chat_completion" and .service=="elastic")' >/dev/null; then
        echo "✅ EIS endpoints available"
        break
      fi
      if [[ "$attempt" == "10" ]]; then
        echo "❌ Timed out waiting for EIS endpoints"
        curl -sSf -u elastic:changeme "$ES_URL/_inference/_all" || true
        exit 1
      fi
      sleep 3
    done
  fi
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

