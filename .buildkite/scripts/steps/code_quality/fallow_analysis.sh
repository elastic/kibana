#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

FALLOW_VERSION="2.76.0"
FALLOW_OWNERS="@elastic/search-kibana @elastic/workchat-eng"
FALLOW_JSON=".fallow/fallow-results.json"
REPORT_SCRIPT=".buildkite/scripts/steps/code_quality/fallow_report.mjs"
SLACK_SCRIPT=".buildkite/scripts/steps/code_quality/fallow_slack_notify.mjs"
OWNER_SNAPSHOT=".fallow/owner-snapshot.json"
OWNER_SNAPSHOT_PREV=".fallow/owner-snapshot-prev.json"
GCS_SNAPSHOT="gs://ci-artifacts.kibana.dev/code-quality/fallow-owner-snapshot.json"

echo "--- fallow v${FALLOW_VERSION}"
.buildkite/node_modules/.bin/fallow --version

mkdir -p .fallow

echo "Fetching previous owner snapshot for trend analysis..."
.buildkite/scripts/common/activate_service_account.sh gs://ci-artifacts.kibana.dev
gsutil cp "$GCS_SNAPSHOT" "$OWNER_SNAPSHOT_PREV" 2>/dev/null \
  && echo "Previous owner snapshot loaded from GCS" \
  || echo "No previous owner snapshot found in GCS — first run without trend"
.buildkite/scripts/common/activate_service_account.sh --unset-impersonation

echo "--- Run fallow analysis"
echo "Checks: complexity hotspots · per-file health scores"
echo "Scope: @elastic/search-kibana and @elastic/workchat-eng (via CODEOWNERS, excludes tests/stories/mocks)"
echo "Note: dead code detection skipped (unreliable in Kibana — @kbn/* path aliases not resolved by fallow)"
echo ""
echo "Run locally (same as CI):"
echo "  npx fallow health --format json --quiet > fallow.json"
echo "  node ${REPORT_SCRIPT} fallow.json --owners ${FALLOW_OWNERS}"
set +e
.buildkite/node_modules/.bin/fallow health \
  --format json \
  --quiet \
  > "$FALLOW_JSON"
set -e

echo "--- Process results"
PREV_SNAPSHOT_FLAG=""
if [ -f "$OWNER_SNAPSHOT_PREV" ]; then
  PREV_SNAPSHOT_FLAG="--prev-snapshot ${OWNER_SNAPSHOT_PREV}"
fi
# shellcheck disable=SC2086
REPORT=$(node "$REPORT_SCRIPT" "$FALLOW_JSON" \
  --owners $FALLOW_OWNERS \
  --save-owner-snapshot "$OWNER_SNAPSHOT" \
  $PREV_SNAPSHOT_FLAG)

ANNOTATION=$(printf '%s' "$REPORT" | sed -n '/^---ANNOTATION---$/,$ p' | tail -n +2)
SECTIONS=$(printf '%s' "$REPORT" | sed '/^---ANNOTATION---$/,$ d')

echo "$SECTIONS"

echo "--- Post Buildkite annotation"
buildkite-agent annotate --style info --context fallow-report "$ANNOTATION"

echo "--- Save owner snapshot for next run"
.buildkite/scripts/common/activate_service_account.sh gs://ci-artifacts.kibana.dev
gsutil cp "$OWNER_SNAPSHOT" "$GCS_SNAPSHOT"
.buildkite/scripts/common/activate_service_account.sh --unset-impersonation

if [ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" = "true" ]; then
  echo "--- Send Slack notification"
  CHANNEL="${SLACK_NOTIFICATIONS_CHANNEL:-#search-code-quality-check-test}"
  BUILD_URL="${BUILDKITE_BUILD_URL:-}"

  # Build plain-text message from annotation (strip markdown **)
  SLACK_TEXT=$(printf '%s' "$ANNOTATION" | sed 's/\*\*//g; /^$/d')
  if [ -n "$BUILD_URL" ]; then
    SLACK_TEXT="${SLACK_TEXT}
Build: ${BUILD_URL}"
  fi

  # Upload a step with step-level notify — Buildkite delivers via org-level Slack integration.
  # Step-level notify (not top-level) fires when the step itself completes.
  NOTIFY_YML="$(mktemp /tmp/fallow_notify_XXXXXX.yml)"
  {
    echo "steps:"
    echo "  - label: \":slack: Code Quality Notify\""
    echo "    command: \"echo 'Code Quality report sent to Slack'\""
    echo "    agents:"
    echo "      image: family/kibana-ubuntu-2404"
    echo "      imageProject: elastic-images-prod"
    echo "      provider: gcp"
    echo "      machineType: n2-standard-2"
    echo "      preemptible: true"
    echo "    notify:"
    echo "      - slack:"
    echo "          channels:"
    echo "            - \"${CHANNEL}\""
    echo "          message: |"
    while IFS= read -r line; do
      echo "            ${line}"
    done <<< "$SLACK_TEXT"
    echo "        if: step.outcome == \"passed\""
  } > "$NOTIFY_YML"

  buildkite-agent pipeline upload "$NOTIFY_YML"
  rm -f "$NOTIFY_YML"
fi
