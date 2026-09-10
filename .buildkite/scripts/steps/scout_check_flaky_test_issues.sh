#!/usr/bin/env bash
set -euo pipefail

# Tells, for every flaky test suite in the report produced by scout_report_flaky_tests.sh, which
# GitHub failed-test issues are about it, open or closed, via `node scripts/check_flaky_test_issues`.
# Read-only: nothing is filed or edited.
# FLAKY_TESTS_GITHUB_REPO names the repository whose issues are checked. GITHUB_TOKEN
# (kibanamachine) comes from Vault via .buildkite/scripts/common/setup_job_env.sh.

source .buildkite/scripts/common/util.sh

# Ensure we're in the repo root
cd "${KIBANA_DIR:-$(pwd)}"

FLAKY_TESTS_GITHUB_REPO="${FLAKY_TESTS_GITHUB_REPO:-elastic/kibana}"

REPORT_DIR="target/flaky_tests"
# Uploaded by the discover-flaky-tests step; keep the paths in sync
REPORT_PATH="$REPORT_DIR/flaky_tests.json"
SUMMARY_PATH="$REPORT_DIR/github_issues.json"

echo "--- Bootstrap Kibana"
# The step only runs Node scripts; skip building the dev-mode shared webpack bundles
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

echo "--- Download flaky test report"
download_artifact "$REPORT_PATH" . --step discover-flaky-tests

echo "+++ Check GitHub issues of flaky suites"
echo "    Repository : $FLAKY_TESTS_GITHUB_REPO"

node scripts/check_flaky_test_issues \
  --input "$REPORT_PATH" \
  --summary-path "$SUMMARY_PATH" \
  --github-repo "$FLAKY_TESTS_GITHUB_REPO"

echo "--- Upload issue summary"
buildkite-agent artifact upload "$SUMMARY_PATH"

echo "--- Annotate build"
suites="$(jq -r '.suites' "$SUMMARY_PATH")"
issues="$(jq -r '.candidateIssues' "$SUMMARY_PATH")"
tracked_open="$(jq -r '[.results[] | select(.status == "tracked" and any(.issues[]; .state == "open"))] | length' "$SUMMARY_PATH")"
counts="$(jq -r --arg open "$tracked_open" '.counts | "**\(.tracked)** tracked by existing issues (\($open) by an open one), **\(.untracked)** without any"' "$SUMMARY_PATH")"

# Markdown section with one bullet per suite of the given status, linking its issues (strongest
# match first, open before closed); collapsed when it is likely to be long
section() {
  local status="$1" title="$2" collapsed="$3"
  local count
  count="$(jq -r --arg status "$status" '[.results[] | select(.status == $status)] | length' "$SUMMARY_PATH")"
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
  jq -r --arg status "$status" '.results[] | select(.status == $status)
    | "- `\(.filePath)`"
      + (if .issues then " " + (.issues | map("[#\(.number)](\(.url)) (\(.match), \(.state))") | join(", ")) else "" end)' "$SUMMARY_PATH"
  if [[ "$collapsed" == "true" ]]; then
    echo
    echo "</details>"
  fi
}

{
  echo "Checked the ${issues} open or closed \`failed-test\` issues in \`${FLAKY_TESTS_GITHUB_REPO}\` that mention one of the ${suites} flaky suites' file names: ${counts}."
  section tracked "Tracked by existing issues" true
  section untracked "No issue" true
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style info --context flaky-test-issues
