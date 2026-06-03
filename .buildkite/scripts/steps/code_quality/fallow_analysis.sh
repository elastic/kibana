#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS="@elastic/search-kibana @elastic/workchat-eng"
FALLOW_JSON=".fallow/fallow-results.json"
REPORT_SCRIPT=".buildkite/scripts/steps/code_quality/fallow_report.mjs"
SLACK_SCRIPT=".buildkite/scripts/steps/code_quality/fallow_slack_notify.mjs"

echo "--- fallow v${FALLOW_VERSION}"
.buildkite/node_modules/.bin/fallow --version

mkdir -p .fallow

SNAPSHOT_DIR=".fallow/snapshots"
SNAPSHOT_FILE="fallow-snapshot.json"
SAVE_SNAPSHOT_FLAG=""
if [ "${BUILDKITE_PIPELINE_SLUG:-}" = "kibana-code-quality-fallow" ] || [ "${FALLOW_SAVE_SNAPSHOT:-}" = "true" ]; then
  mkdir -p "$SNAPSHOT_DIR"
  SAVE_SNAPSHOT_FLAG="--save-snapshot ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
fi

# Use --trend if a previous snapshot exists
TREND_FLAG=""
if [ -n "$(ls -A "$SNAPSHOT_DIR" 2>/dev/null)" ]; then
  TREND_FLAG="--trend"
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
  $TREND_FLAG \
  $SAVE_SNAPSHOT_FLAG \
  > "$FALLOW_JSON"
set -e

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

if [ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" = "true" ] && [ -n "${SLACK_BOT_TOKEN:-}" ]; then
  echo "--- Send Slack notification"
  # shellcheck disable=SC2086
  node "$SLACK_SCRIPT" "$FALLOW_JSON" \
    --owners $FALLOW_OWNERS \
    --channel "${SLACK_NOTIFICATIONS_CHANNEL:-#search-code-quality-check-test}" \
    --build-url "${BUILDKITE_BUILD_URL:-}"
fi
