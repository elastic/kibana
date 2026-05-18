#!/usr/bin/env bash

set -euo pipefail

GOLDEN_CLUSTER_EVALS_URL='https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud/app/evals'
PIPELINE_URL='https://buildkite.com/elastic/kibana-evals-on-demand'

missing=()
if [[ -z "${EVAL_SUITE_ID:-}" ]]; then
  missing+=('EVAL_SUITE_ID')
fi
if [[ -z "${EVAL_MODEL_GROUPS:-}" ]]; then
  missing+=('EVAL_MODEL_GROUPS')
fi

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo "On-demand eval build is missing required environment variable(s): ${missing[*]}"
  echo ""
  echo "When starting a New build, set environment variables on the build. Example:"
  echo ""
  node x-pack/platform/packages/shared/kbn-evals/scripts/ci/resolve_on_demand_eval_env.js \
    --suite agent-builder \
    --model eis/openai-gpt-5.4 \
    --format env
  echo ""
  echo "Suite ids are listed in .buildkite/pipelines/evals/evals.suites.json"
  echo "Model values match PR labels without the models: prefix (e.g. eis/openai-gpt-5.4)."
  echo ""
  echo "Pipeline: ${PIPELINE_URL}"
  exit 1
fi

# Validate suite id exists (fail fast with a helpful list).
node x-pack/platform/packages/shared/kbn-evals/scripts/ci/resolve_on_demand_eval_env.js \
  --suite "${EVAL_SUITE_ID}" \
  --model "${EVAL_MODEL_GROUPS}" \
  --format env >/dev/null

echo "On-demand eval inputs:"
echo "  EVAL_SUITE_ID=${EVAL_SUITE_ID}"
echo "  EVAL_MODEL_GROUPS=${EVAL_MODEL_GROUPS}"
if [[ -n "${EVALUATION_CONNECTOR_ID:-}" ]]; then
  echo "  EVALUATION_CONNECTOR_ID=${EVALUATION_CONNECTOR_ID}"
fi
if [[ -n "${EVAL_SERVER_CONFIG_SET:-}" ]]; then
  echo "  EVAL_SERVER_CONFIG_SET=${EVAL_SERVER_CONFIG_SET}"
fi
echo ""
echo "Results will be exported to the golden cluster evals UI:"
echo "  ${GOLDEN_CLUSTER_EVALS_URL}"
if [[ -n "${BUILDKITE_BUILD_ID:-}" ]]; then
  echo "  Run id prefix after the eval step: bk-${BUILDKITE_BUILD_ID}"
fi

if command -v buildkite-agent >/dev/null 2>&1; then
  annotate_body="$(cat <<EOF
**On-demand LLM eval**

- Suite: \`${EVAL_SUITE_ID}\`
- Model: \`${EVAL_MODEL_GROUPS}\`
- [Evals UI (golden cluster)](${GOLDEN_CLUSTER_EVALS_URL})
$(
  if [[ -n "${BUILDKITE_BUILD_ID:-}" ]]; then
    echo "- Run id prefix: \`bk-${BUILDKITE_BUILD_ID}\`"
  fi
)
EOF
)"
  buildkite-agent annotate "$annotate_body" --style info --context kbn-evals-on-demand || true
fi
