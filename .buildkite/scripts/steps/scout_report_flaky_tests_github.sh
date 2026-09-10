#!/usr/bin/env bash
set -euo pipefail

# Turns the flaky test report produced by scout_report_flaky_tests.sh into GitHub issues, one per
# flaky test suite, via `node scripts/report_flaky_tests`. Issues go to FLAKY_TESTS_GITHUB_REPO:
# a sandbox repository while the format settles, elastic/kibana once it is live. An empty value
# means dry run (requests logged, nothing filed), so manual builds and new schedules stay
# read-only until someone opts in. GITHUB_TOKEN (kibanamachine) comes from Vault via
# .buildkite/scripts/common/setup_job_env.sh and needs write access to the issues of that repo.

source .buildkite/scripts/common/util.sh

# Ensure we're in the repo root
cd "${KIBANA_DIR:-$(pwd)}"

FLAKY_TESTS_GITHUB_REPO="${FLAKY_TESTS_GITHUB_REPO:-}"
FLAKY_TESTS_MAX_NEW_ISSUES="${FLAKY_TESTS_MAX_NEW_ISSUES:-10}"
LIVE_REPO="elastic/kibana"

REPORT_DIR="target/flaky_tests"
# Uploaded by the discover-flaky-tests step; keep the paths in sync
REPORT_PATH="$REPORT_DIR/flaky_tests.json"
SUMMARY_PATH="$REPORT_DIR/github_issues.json"

if [[ -z "$FLAKY_TESTS_GITHUB_REPO" ]]; then
  mode="dry run"
elif [[ "$FLAKY_TESTS_GITHUB_REPO" == "$LIVE_REPO" ]]; then
  mode="live"
else
  mode="sandbox"
fi

echo "--- Bootstrap Kibana"
# The step only runs Node scripts; skip building the dev-mode shared webpack bundles
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

echo "--- Download flaky test report"
download_artifact "$REPORT_PATH" . --step discover-flaky-tests

echo "+++ Report flaky suites to GitHub"
echo "    Mode           : $mode"
echo "    Repository     : ${FLAKY_TESTS_GITHUB_REPO:-none}"
echo "    Max new issues : $FLAKY_TESTS_MAX_NEW_ISSUES"

args=(
  --input "$REPORT_PATH"
  --summary-path "$SUMMARY_PATH"
  --max-new-issues "$FLAKY_TESTS_MAX_NEW_ISSUES"
  --report-url "$BUILDKITE_BUILD_URL"
)
if [[ "$mode" == "dry run" ]]; then
  args+=(--dry-run)
else
  args+=(--github-repo "$FLAKY_TESTS_GITHUB_REPO")
fi

node scripts/report_flaky_tests "${args[@]}"

echo "--- Upload issue summary"
buildkite-agent artifact upload "$SUMMARY_PATH"

echo "--- Annotate build"
suites="$(jq -r '.suites' "$SUMMARY_PATH")"
if [[ "$mode" == "dry run" ]]; then
  counts="$(jq -r '.counts | "**\(.created)** would be created, **\(.existing)** already tracked, **\(.skipped)** would be skipped by the cap"' "$SUMMARY_PATH")"
else
  counts="$(jq -r '.counts | "**\(.created)** created, **\(.existing)** already tracked, **\(.skipped)** skipped by the cap"' "$SUMMARY_PATH")"
fi

# One bullet per suite of the given action; created issues link to GitHub except in dry-run mode,
# where nothing was filed.
list_suites() {
  local action="$1"
  if [[ "$mode" == "dry run" && "$action" == "created" ]]; then
    jq -r --arg action "$action" '.actions[] | select(.action == $action) | "- `\(.filePath)`"' "$SUMMARY_PATH"
  elif [[ "$action" == "skipped" ]]; then
    jq -r --arg action "$action" '.actions[] | select(.action == $action) | "- `\(.filePath)`"' "$SUMMARY_PATH"
  else
    jq -r --arg action "$action" '.actions[] | select(.action == $action)
      | "- [#\(.issue.number)](\(.issue.url)) `\(.filePath)`"' "$SUMMARY_PATH"
  fi
}

# Markdown section for one action, collapsed when it is likely to be long
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
    echo
    list_suites "$action"
    echo
    echo "</details>"
  else
    echo "**${title} (${count})**"
    echo
    list_suites "$action"
  fi
}

{
  case "$mode" in
    live)
      echo "GitHub issues for ${suites} flaky suites: ${counts}."
      ;;
    sandbox)
      echo "GitHub issues for ${suites} flaky suites, filed in the \`${FLAKY_TESTS_GITHUB_REPO}\` sandbox (set \`FLAKY_TESTS_GITHUB_REPO=${LIVE_REPO}\` to go live): ${counts}."
      ;;
    *)
      echo "Dry run for ${suites} flaky suites (set \`FLAKY_TESTS_GITHUB_REPO\` to file issues): ${counts}."
      ;;
  esac
  if [[ "$mode" == "dry run" ]]; then
    section created "Would create an issue" false
  else
    section created "Created" false
  fi
  section existing "Already tracked by an open issue" true
  section skipped "Skipped, cap of ${FLAKY_TESTS_MAX_NEW_ISSUES} new issues per run reached" true
  echo
  echo "Summary: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
} | buildkite-agent annotate --style info --context flaky-test-issues
