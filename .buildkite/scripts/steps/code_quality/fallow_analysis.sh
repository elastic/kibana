#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS="@elastic/search-kibana @elastic/workchat-eng"
FALLOW_JSON=".fallow/fallow-results.json"
REPORT_SCRIPT=".buildkite/scripts/steps/code_quality/fallow_report.mjs"

echo "--- fallow v${FALLOW_VERSION}"
.buildkite/node_modules/.bin/fallow --version

mkdir -p .fallow

SNAPSHOT_DIR=".fallow/snapshots"
SNAPSHOT_FILE="fallow-snapshot.json"
SAVE_SNAPSHOT_FLAG=""
if [ "${BUILDKITE_PIPELINE_SLUG:-}" = "kibana-code-quality-fallow" ]; then
  mkdir -p "$SNAPSHOT_DIR"
  SAVE_SNAPSHOT_FLAG="--save-snapshot ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi

echo "--- Run fallow analysis"
echo "Checks: complexity hotspots · per-file health scores"
echo "Scope: @elastic/search-kibana and @elastic/workchat-eng (via CODEOWNERS, excludes tests/stories/mocks)"
echo "Note: dead code detection skipped (unreliable in Kibana — @kbn/* path aliases not resolved by fallow)"
echo ""
echo "Run locally (same as CI):"
echo "  npx fallow health --format json --quiet > fallow.json"
echo "  node ${REPORT_SCRIPT} fallow.json --owners ${FALLOW_OWNERS}"
set +e
# shellcheck disable=SC2086
.buildkite/node_modules/.bin/fallow health \
  --format json \
  --quiet \
  $SAVE_SNAPSHOT_FLAG \
  > "$FALLOW_JSON"
FALLOW_EXIT=$?
set -e

# fallow exits 1 when it emits warnings (expected in Kibana's monorepo — missing
# node_modules, tsconfig chain issues). Only treat as a real failure if the output
# file is missing or empty, which indicates a crash rather than warnings.
if [ "$FALLOW_EXIT" -ne 0 ] && [ ! -s "$FALLOW_JSON" ]; then
  echo "fallow health failed (exit $FALLOW_EXIT) — no output produced" >&2
  exit "$FALLOW_EXIT"
fi

echo "--- Process results"
# shellcheck disable=SC2086
REPORT=$(node "$REPORT_SCRIPT" "$FALLOW_JSON" --owners $FALLOW_OWNERS)

ANNOTATION=$(printf '%s' "$REPORT" | sed -n '/^---ANNOTATION---$/,$ p' | tail -n +2)
SECTIONS=$(printf '%s' "$REPORT" | sed '/^---ANNOTATION---$/,$ d')

echo "$SECTIONS"

echo "--- Post Buildkite annotation"
buildkite-agent annotate --style info --context fallow-report "$ANNOTATION"

if [ -n "$SAVE_SNAPSHOT_FLAG" ]; then
  echo "--- Save snapshot for next run"
  buildkite-agent artifact upload "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi
