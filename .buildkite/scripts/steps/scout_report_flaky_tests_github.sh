#!/usr/bin/env bash
set -euo pipefail

# Turns the flaky test report produced by scout_report_flaky_tests.sh into GitHub issues, one per
# flaky test suite, via `node scripts/report_flaky_tests`. Runs in dry-run mode (requests logged,
# nothing filed) unless FLAKY_TESTS_REPORT_TO_GITHUB=true, so manual builds and new schedules
# stay read-only until someone opts in. GITHUB_TOKEN (kibanamachine) comes from Vault via
# .buildkite/scripts/common/setup_job_env.sh.

source .buildkite/scripts/common/util.sh

# Ensure we're in the repo root
cd "${KIBANA_DIR:-$(pwd)}"

FLAKY_TESTS_REPORT_TO_GITHUB="${FLAKY_TESTS_REPORT_TO_GITHUB:-false}"
FLAKY_TESTS_MAX_NEW_ISSUES="${FLAKY_TESTS_MAX_NEW_ISSUES:-10}"

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

echo "+++ Report flaky suites to GitHub"
echo "    Mode           : $([[ "$FLAKY_TESTS_REPORT_TO_GITHUB" == "true" ]] && echo "live" || echo "dry run")"
echo "    Max new issues : $FLAKY_TESTS_MAX_NEW_ISSUES"

args=(
  --input "$REPORT_PATH"
  --summary-path "$SUMMARY_PATH"
  --max-new-issues "$FLAKY_TESTS_MAX_NEW_ISSUES"
  --report-url "$BUILDKITE_BUILD_URL"
)
if [[ "$FLAKY_TESTS_REPORT_TO_GITHUB" != "true" ]]; then
  args+=(--dry-run)
fi

node scripts/report_flaky_tests "${args[@]}"

echo "--- Upload issue summary"
buildkite-agent artifact upload "$SUMMARY_PATH"

echo "--- Annotate build"
counts="$(jq -r '.counts | "**\(.created)** created, **\(.existing)** already tracked, **\(.skipped)** skipped by the cap"' "$SUMMARY_PATH")"
suites="$(jq -r '.suites' "$SUMMARY_PATH")"

{
  if [[ "$FLAKY_TESTS_REPORT_TO_GITHUB" == "true" ]]; then
    echo "GitHub issues for ${suites} flaky suites: ${counts}."
    echo
    jq -r '.actions[] | select(.action == "created")
      | "- created: [#\(.issue.number)](\(.issue.url)) `\(.filePath)`"' "$SUMMARY_PATH"
  else
    echo "Dry run for ${suites} flaky suites (set \`FLAKY_TESTS_REPORT_TO_GITHUB=true\` to file issues): ${counts}."
    echo
    jq -r '.actions[] | select(.action == "created")
      | "- would be created: `\(.filePath)`"' "$SUMMARY_PATH"
  fi
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style info --context flaky-test-issues
