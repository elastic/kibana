#!/usr/bin/env bash
set -euo pipefail

# Files a GitHub failed-test issue for every flaky suite in the report produced by
# report_flaky_tests.sh that has none yet, via `node scripts/report_flaky_test_issues`.
#
# FLAKY_TESTS_GITHUB_REPO selects the mode:
#   - empty: dry run against elastic/kibana, the real issues are read and the would-be actions
#     logged and annotated, nothing is written;
#   - a sandbox such as elastic/appex-qa-ai: issues are filed there, except for suites whose
#     every flaky test already has a failed-test issue in FLAKY_TESTS_TRACKING_REPO (elastic/kibana);
#   - elastic/kibana: live.
# Every open failed-test issue is fetched, plus those closed in the last
# FLAKY_TESTS_CLOSED_ISSUES_DAYS days; both count as tracking a suite. At most
# FLAKY_TESTS_MAX_NEW_ISSUES issues are created per run.
# GITHUB_TOKEN (kibanamachine) comes from Vault via .buildkite/scripts/common/setup_job_env.sh.

source .buildkite/scripts/common/util.sh

# Ensure we're in the repo root
cd "${KIBANA_DIR:-$(pwd)}"

FLAKY_TESTS_GITHUB_REPO="${FLAKY_TESTS_GITHUB_REPO:-}"
FLAKY_TESTS_CLOSED_ISSUES_DAYS="${FLAKY_TESTS_CLOSED_ISSUES_DAYS:-365}"
FLAKY_TESTS_MAX_NEW_ISSUES="${FLAKY_TESTS_MAX_NEW_ISSUES:-10}"
FLAKY_TESTS_TRACKING_REPO="${FLAKY_TESTS_TRACKING_REPO-elastic/kibana}"

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
if [[ -n "$FLAKY_TESTS_TRACKING_REPO" && "$FLAKY_TESTS_TRACKING_REPO" != "$GITHUB_REPO" ]]; then
  echo "    Also tracked in     : $FLAKY_TESTS_TRACKING_REPO (suites whose every test has an issue there get none)"
fi

args=(
  --input "$REPORT_PATH"
  --summary-path "$SUMMARY_PATH"
  --github-repo "$GITHUB_REPO"
  --closed-since-days "$FLAKY_TESTS_CLOSED_ISSUES_DAYS"
  --max-new-issues "$FLAKY_TESTS_MAX_NEW_ISSUES"
  --tracking-repo "$FLAKY_TESTS_TRACKING_REPO"
)
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
issues="$(jq -r '.issues | "\(.open) open and \(.closed) closed since \(.closedSince[:10])"
  + (if .tracking then ", plus \(.tracking.open) open and \(.tracking.closed) closed in `\(.tracking.repo)`" else "" end)' "$SUMMARY_PATH")"
counts="$(jq -r '.counts | "**\(.created)** created, \(.skipped) skipped, \(.failed) failed"' "$SUMMARY_PATH")"

# Markdown section with one bullet per suite the given action applies to, linking the issue
# (qualified by its repository when it is not the target one); collapsed when it is likely to
# be long
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
      + (if .suiteTitle then " · \(.suiteTitle)" else "" end)
      + (if .issue then " [\(.issue.repo // "")#\(.issue.number)](\(.issue.url))" else "" end)
      + (if .issue and .issue.state == "closed" then " (closed)" else "" end)
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
  headline="Checked ${suites} flaky suites against the \`failed-test\` issues in \`${GITHUB_REPO}\` (${issues}): ${counts}."
  style="success"
fi
if [[ "$exit_code" != "0" ]]; then
  style="error"
fi

{
  echo "$headline"
  section created "Created" false
  section failed "Failed" false
  section skipped "Skipped" true
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style "$style" --context flaky-test-issues

exit "$exit_code"
