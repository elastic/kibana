#!/usr/bin/env bash
set -euo pipefail

# Runs the Scout quality audit and posts its findings to Slack.
# Scheduled, read only: it never fails the build on findings and never changes code.

cd "${KIBANA_DIR:-$(pwd)}"

echo "--- Bootstrap Kibana"
.buildkite/scripts/bootstrap.sh

echo "--- Run Scout audit"
report_file="$(mktemp -t scout-audit.XXXXXX.md)"
json_file="$(mktemp -t scout-audit.XXXXXX.json)"
node scripts/scout.js audit --format text | tee "$report_file"
node scripts/scout.js audit > "$json_file"

# Full report goes to the build annotation. Slack gets counts and a link.
# The report uses Slack syntax; annotations render Markdown, so convert bold titles and bullets.
awk '/^\*.*\*$/ { sub(/^\*/, "**"); sub(/\*$/, "**"); print; print ""; next }
     /^• / { sub(/^• /, "- "); print; next }
     { print }' "$report_file" | buildkite-agent annotate --style info --context scout-audit

summary="$(jq -r '
  [
    ((.census | map(select(.fileCount <= 1)) | length) | tostring) + " page object keys with at most one consumer",
    ((.census | map(select(.fileCount > 1 and (.modules | length) == 1)) | length) | tostring) + " used by a single module",
    ((.duplicateClassNames | length) | tostring) + " duplicate class names",
    ((.configSets.sameAsDefault | length) | tostring) + " config sets identical to the default",
    ((.configSets.identical | length) | tostring) + " groups of identical config sets",
    ((.configSets.subsets | map(.set) | unique | length) | tostring) + " config sets covered by another set",
    ((.configSets.runtimeOnly | length) | tostring) + " config sets that only change runtime settings",
    ((.configSets.failed | length) | tostring) + " config sets the audit could not load"
  ] | map(select(startswith("0 ") | not)) | join(", ")
' "$json_file")"
[[ -z "$summary" ]] && summary="no findings"

channel="${SLACK_NOTIFICATIONS_CHANNEL:-}"
if [[ "${KIBANA_SLACK_NOTIFICATIONS_ENABLED:-}" != "true" || -z "$channel" ]]; then
  echo "Slack notifications disabled or no channel set, not posting."
  echo "Summary: $summary"
  exit 0
fi

echo "--- Post summary to Slack ($channel)"
notify_file="$(mktemp -t scout-audit-notify.XXXXXX.yml)"
{
  echo 'steps:'
  echo '  - label: ":slack: Scout quality audit"'
  echo "    command: \"echo 'Scout audit summary posted to Slack'\""
  echo '    agents:'
  echo '      image: family/kibana-minimal-ubuntu-2604'
  echo '      imageProject: elastic-images-prod'
  echo '      provider: gcp'
  echo '      machineType: n2-standard-2'
  echo '      preemptible: true'
  echo '    notify:'
  echo '      - slack:'
  echo '          channels:'
  echo "            - \"$channel\""
  echo '          message: |'
  echo "            *Scout quality audit* on \`${BUILDKITE_BRANCH:-main}\`: ${summary}."
  echo "            Full report with names and reasons: <${BUILDKITE_BUILD_URL:-}#annotations|build annotation>."
  echo '        if: step.outcome == "passed"'
} > "$notify_file"

buildkite-agent pipeline upload "$notify_file"
