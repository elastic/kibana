#!/usr/bin/env bash
set -euo pipefail

# Tells, for every flaky test suite in the report produced by scout_report_flaky_tests.sh, whether
# an open GitHub issue already tracks it, via `node scripts/check_flaky_test_issues`. Read-only:
# nothing is filed or edited. FLAKY_TESTS_GITHUB_REPO names the repository whose issues are
# searched. GITHUB_TOKEN (kibanamachine) comes from Vault via
# .buildkite/scripts/common/setup_job_env.sh.

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
open_issues="$(jq -r '.openIssues' "$SUMMARY_PATH")"
counts="$(jq -r '.counts | "**\(.tracked)** tracked by a suite issue, **\(.related)** with related per-test issues, **\(.untracked)** without any open issue"' "$SUMMARY_PATH")"

# Markdown section with one bullet per suite of the given status, linking the suite issue or the
# related per-test issues (strongest match first); collapsed when it is likely to be long
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
      + (if .issue then " [#\(.issue.number)](\(.issue.url))" else "" end)
      + (if .issues then " " + (.issues | map("[#\(.number)](\(.url)) (\(.match))") | join(", ")) else "" end)' "$SUMMARY_PATH"
  if [[ "$collapsed" == "true" ]]; then
    echo
    echo "</details>"
  fi
}

{
  echo "Checked ${open_issues} open \`failed-test\` issues in \`${FLAKY_TESTS_GITHUB_REPO}\` against ${suites} flaky suites: ${counts}."
  section tracked "Tracked by a suite issue" false
  section related "Related per-test issues" true
  section untracked "No open issue" true
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style info --context flaky-test-issues
