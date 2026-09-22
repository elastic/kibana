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
# EVAL_KBN_URL / EVAL_KBN_API_KEY are read from the environment by the CLI.
# Passing the key as --kbn-api-key would put the secret in the process table
# (and in the trace output of any step that runs with `set -x`).
matrix_args=(
  --config "${MATRIX_CONFIG}"
  --out "${MATRIX_OUT_DIR}"
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

# The generator writes a full artifact set even when every cell came back
# unscored, and exits 0 -- that is deliberate, so a human debugging a bad run
# can still inspect what the cluster returned. CI must not publish that board:
# an empty matrix uploaded as a green step is indistinguishable from a real one
# until someone opens it. Fail the step instead.
scored_cells=$(node -e '
  const fs = require("fs");
  const matrix = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const rows = [...(matrix.proprietary ?? []), ...(matrix.openSource ?? [])];
  const columns = (matrix.columns ?? []).map((column) => column.id);
  let scored = 0;
  for (const row of rows) {
    for (const columnId of columns) {
      if (row.cells?.[columnId]?.kind === "score") scored++;
    }
  }
  process.stdout.write(String(scored));
' "${MATRIX_OUT_DIR}/matrix.json")

if [[ "${scored_cells}" == "0" ]]; then
  echo "Matrix produced 0 scored cells -- refusing to publish an empty board." >&2
  echo "The per-prefix score fetch returned nothing usable; check the scores route." >&2
  exit 1
fi

echo "Matrix contains ${scored_cells} scored cells"

echo "--- Uploading matrix artifacts"
buildkite-agent artifact upload "${MATRIX_OUT_DIR}/**/*"

if [[ -f "${MATRIX_OUT_DIR}/matrix.html" ]]; then
  printf '<h4>LLM performance matrix</h4><p>Generated from this build. Download <code>matrix.html</code> from the build artifacts.</p>\n' |
    buildkite-agent annotate --style info --context llm-matrix
fi
