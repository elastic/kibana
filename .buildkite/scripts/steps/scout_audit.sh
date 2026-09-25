#!/usr/bin/env bash
set -euo pipefail

# Runs the Scout quality audit and posts its findings to Slack.
# Scheduled, read only: it never fails the build on findings and never changes code.

cd "${KIBANA_DIR:-$(pwd)}"

echo "--- Bootstrap Kibana"
.buildkite/scripts/bootstrap.sh

echo "--- Run Scout audit"
report_file="$(mktemp -t scout-audit.XXXXXX.md)"
node scripts/scout.js audit --format text | tee "$report_file"

buildkite-agent annotate --style info --context scout-audit < "$report_file"

channel="${SLACK_NOTIFICATIONS_CHANNEL:-}"
if [[ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" != "true" || -z "$channel" ]]; then
  echo "Slack notifications disabled or no channel set, not posting."
  exit 0
fi

echo "--- Post findings to Slack ($channel)"
notify_file="$(mktemp -t scout-audit-notify.XXXXXX.yml)"
{
  echo 'steps:'
  echo '  - label: ":slack: Scout quality audit"'
  echo "    command: \"echo 'Scout audit posted to Slack'\""
  echo '    agents:'
  echo '      image: family/kibana-ubuntu-2404'
  echo '      imageProject: elastic-images-prod'
  echo '      provider: gcp'
  echo '      machineType: n2-standard-2'
  echo '      preemptible: true'
  echo '    notify:'
  echo '      - slack:'
  echo '          channels:'
  echo "            - \"$channel\""
  echo '          message: |'
  sed 's/^/            /' "$report_file"
  echo "            <${BUILDKITE_BUILD_URL:-}|Build #${BUILDKITE_BUILD_NUMBER:-}>"
  echo '        if: step.outcome == "passed"'
} > "$notify_file"

buildkite-agent pipeline upload "$notify_file"
