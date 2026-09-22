#!/usr/bin/env bash

set -euo pipefail

# Renders the security LLM performance matrix from evaluation scores that the
# suite steps just published, and attaches it to the build.
#
# Runs after the eval suites; reads their results back out of the evaluations
# cluster rather than the per-suite stacks, which are gone by this point.

if [[ "${KBN_EVALS_WEEKLY:-}" != "1" ]] && [[ "${KBN_EVALS_WEEKLY:-}" != "true" ]]; then
  echo "generate_matrix.sh is only for weekly evals (KBN_EVALS_WEEKLY=1)"
  exit 0
fi

if [[ -z "${EVAL_KBN_URL:-}" ]]; then
  echo "EVAL_KBN_URL is required to read published evaluation scores" >&2
  exit 1
fi

if [[ -z "${EVAL_KBN_API_KEY:-}" ]]; then
  echo "EVAL_KBN_API_KEY is required to read published evaluation scores" >&2
  exit 1
fi

MATRIX_CONFIG="${MATRIX_CONFIG:-x-pack/platform/packages/shared/kbn-evals-extensions/config/security_matrix_persona.json}"
MATRIX_OUT_DIR="${MATRIX_OUT_DIR:-target/llm_matrix}"

if [[ ! -f "${MATRIX_CONFIG}" ]]; then
  echo "Matrix config not found: ${MATRIX_CONFIG}" >&2
  exit 1
fi

# Bootstrap workspace deps (same setup as the other evals CI steps)
source .buildkite/scripts/steps/functional/common.sh

echo "--- Generating LLM performance matrix"
matrix_args=(
  --config "${MATRIX_CONFIG}"
  --out "${MATRIX_OUT_DIR}"
  --kbn-url "${EVAL_KBN_URL}"
  --kbn-api-key "${EVAL_KBN_API_KEY}"
  --html
)

if [[ -n "${MATRIX_LOOKBACK_DAYS:-}" ]]; then
  matrix_args+=(--lookback-days "${MATRIX_LOOKBACK_DAYS}")
fi

if [[ -n "${MATRIX_BRANCH:-}" ]]; then
  matrix_args+=(--branch "${MATRIX_BRANCH}")
fi

node scripts/evals ext matrix "${matrix_args[@]}"

if [[ ! -d "${MATRIX_OUT_DIR}" ]]; then
  echo "Matrix generation reported success but produced no output directory" >&2
  exit 1
fi

echo "--- Uploading matrix artifacts"
buildkite-agent artifact upload "${MATRIX_OUT_DIR}/**/*"

if [[ -f "${MATRIX_OUT_DIR}/matrix.html" ]]; then
  printf '<h4>LLM performance matrix</h4><p>Generated from this build. Download <code>matrix.html</code> from the build artifacts.</p>\n' |
    buildkite-agent annotate --style info --context llm-matrix
fi
