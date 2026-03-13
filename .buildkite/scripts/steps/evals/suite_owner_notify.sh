#!/usr/bin/env bash

set -euo pipefail

EVAL_SUITE_ID="${EVAL_SUITE_ID:-}"
if [[ -z "${EVAL_SUITE_ID}" ]]; then
  echo "EVAL_SUITE_ID is required"
  exit 1
fi

if ! command -v buildkite-agent >/dev/null 2>&1; then
  echo "buildkite-agent is required"
  exit 1
fi

suite_key_safe="$(printf '%s' "$EVAL_SUITE_ID" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g; s/-+/-/g; s/^-|-$//g')"
failures_key="kbn-evals:suite-failures:${suite_key_safe}"

failures="$(buildkite-agent meta-data get "$failures_key" --default '')"
if [[ -z "${failures}" ]]; then
  echo "No failures recorded for suite ${EVAL_SUITE_ID}"
  exit 0
fi

suite_name="${EVAL_SUITE_NAME:-$EVAL_SUITE_ID}"

echo "Suite failed: ${suite_name} (${EVAL_SUITE_ID})"
echo ""
echo "Failing connector projects:"
echo "${failures}" | sed 's/^/- /'
echo ""
echo "Build: ${BUILDKITE_BUILD_URL:-}"

exit 1

