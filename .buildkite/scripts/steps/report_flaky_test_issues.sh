#!/usr/bin/env bash
set -euo pipefail

# Files, comments on or reopens GitHub failed-test issues for the flaky suites in the report
# produced by report_flaky_tests.sh, via `node scripts/report_flaky_test_issues`.
#
# FLAKY_TESTS_GITHUB_REPO selects the mode:
#   - empty (default): dry run against elastic/kibana, the real issues are read and the would-be
#     actions logged and annotated, nothing is written;
#   - a sandbox such as elastic/appex-qa-ai: issues are written there;
#   - elastic/kibana: live.
# Every open failed-test issue is fetched, plus those closed in the last
# FLAKY_TESTS_CLOSED_ISSUES_DAYS days. At most FLAKY_TESTS_MAX_NEW_ISSUES issues are created per
# run and an issue gets a comment at most once per FLAKY_TESTS_MIN_COMMENT_INTERVAL_DAYS days.
# GITHUB_TOKEN (kibanamachine) comes from Vault via .buildkite/scripts/common/setup_job_env.sh.

source .buildkite/scripts/common/util.sh

# Ensure we're in the repo root
cd "${KIBANA_DIR:-$(pwd)}"

FLAKY_TESTS_GITHUB_REPO="${FLAKY_TESTS_GITHUB_REPO:-}"
FLAKY_TESTS_CLOSED_ISSUES_DAYS="${FLAKY_TESTS_CLOSED_ISSUES_DAYS:-365}"
FLAKY_TESTS_MAX_NEW_ISSUES="${FLAKY_TESTS_MAX_NEW_ISSUES:-10}"
FLAKY_TESTS_MIN_COMMENT_INTERVAL_DAYS="${FLAKY_TESTS_MIN_COMMENT_INTERVAL_DAYS:-3}"
FLAKY_TESTS_DASHBOARD_URL="${FLAKY_TESTS_DASHBOARD_URL:-}"

REPORT_DIR="target/flaky_tests"
# Uploaded by the discover-flaky-tests step; keep the paths in sync
REPORT_PATH="$REPORT_DIR/flaky_tests.json"
SUMMARY_PATH="$REPORT_DIR/github_issues.json"

if [[ -z "$FLAKY_TESTS_GITHUB_REPO" ]]; then
  MODE="dry run"
  GITHUB_REPO="elastic/kibana"
  DRY_RUN_ARGS=(--dry-run)
elif [[ "$FLAKY_TESTS_GITHUB_REPO" == "elastic/kibana" ]]; then
  MODE="live"
  GITHUB_REPO="$FLAKY_TESTS_GITHUB_REPO"
  DRY_RUN_ARGS=()
else
  MODE="sandbox"
  GITHUB_REPO="$FLAKY_TESTS_GITHUB_REPO"
  DRY_RUN_ARGS=()
fi

echo "--- Bootstrap Kibana"
# The step only runs Node scripts; skip building the dev-mode shared webpack bundles
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

echo "--- Download flaky test report"
download_artifact "$REPORT_PATH" . --step discover-flaky-tests

echo "+++ Report flaky suites to GitHub ($MODE)"
echo "    Repository          : $GITHUB_REPO"
echo "    Closed issues since : $FLAKY_TESTS_CLOSED_ISSUES_DAYS days ago"
echo "    Max new issues      : $FLAKY_TESTS_MAX_NEW_ISSUES"
echo "    Comment interval    : $FLAKY_TESTS_MIN_COMMENT_INTERVAL_DAYS days"

args=(
  --input "$REPORT_PATH"
  --summary-path "$SUMMARY_PATH"
  --github-repo "$GITHUB_REPO"
  --closed-since-days "$FLAKY_TESTS_CLOSED_ISSUES_DAYS"
  --max-new-issues "$FLAKY_TESTS_MAX_NEW_ISSUES"
  --min-comment-interval-days "$FLAKY_TESTS_MIN_COMMENT_INTERVAL_DAYS"
)
if [[ -n "$FLAKY_TESTS_DASHBOARD_URL" ]]; then
  args+=(--dashboard-url "$FLAKY_TESTS_DASHBOARD_URL")
fi
if [[ ${#DRY_RUN_ARGS[@]} -gt 0 ]]; then
  args+=("${DRY_RUN_ARGS[@]}")
fi

# A failed GitHub write makes the CLI exit non-zero after handling every suite; annotate first,
# then fail the step
exit_code=0
node scripts/report_flaky_test_issues "${args[@]}" || exit_code=$?

echo "--- Upload issue summary"
if [[ ! -f "$SUMMARY_PATH" ]]; then
  echo "No summary was written, the CLI failed before handling any suite"
  exit "$exit_code"
fi
buildkite-agent artifact upload "$SUMMARY_PATH"

echo "--- Annotate build"
suites="$(jq -r '.suites' "$SUMMARY_PATH")"
issues="$(jq -r '.issues | "\(.open) open and \(.closed) closed since \(.closedSince[:10])"' "$SUMMARY_PATH")"
counts="$(jq -r '.counts | "**\(.created)** created, **\(.commented)** commented on, **\(.reopened)** reopened, \(.skipped) skipped, \(.failed) failed"' "$SUMMARY_PATH")"

# Markdown section with one bullet per suite the given action applies to, linking the issue;
# collapsed when it is likely to be long
section() {
  local action="$1" title="$2" collapsed="$3"
  local count
  count="$(jq -r --arg action "$action" '[.actions[] | select(.action == $action)] | length' "$SUMMARY_PATH")"
  if [[ "$count" == "0" ]]; then
    return
  fi
  echo
  if [[ "$collapsed" == "true" ]]; then
    echo "<details><summary>${title} (${count})</summary>"
  else
    echo "**${title} (${count})**"
  fi
  echo
  jq -r --arg action "$action" '.actions[] | select(.action == $action)
    | "- `\(.filePath)`"
      + (if .issue then " [#\(.issue.number)](\(.issue.url))" else "" end)
      + (if .match then " (\(.match))" else "" end)
      + (if .reason then ": \(.reason)" else "" end)
      + (if .error then ": \(.error)" else "" end)' "$SUMMARY_PATH"
  if [[ "$collapsed" == "true" ]]; then
    echo
    echo "</details>"
  fi
}

if [[ "$MODE" == "dry run" ]]; then
  headline="Dry run: ${suites} flaky suites against the \`failed-test\` issues in \`${GITHUB_REPO}\` (${issues}), nothing was written. Would be: ${counts}."
  style="info"
else
  headline="Reported ${suites} flaky suites to the \`failed-test\` issues in \`${GITHUB_REPO}\` (${issues}): ${counts}."
  style="success"
fi
if [[ "$exit_code" != "0" ]]; then
  style="error"
fi

{
  echo "$headline"
  section created "Created" false
  section commented "Commented on" true
  section reopened "Reopened" false
  section failed "Failed" false
  section skipped "Skipped" true
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style "$style" --context flaky-test-issues

exit "$exit_code"
