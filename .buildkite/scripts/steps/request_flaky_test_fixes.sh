#!/usr/bin/env bash
set -euo pipefail

source .buildkite/scripts/common/util.sh
cd "${KIBANA_DIR:-$(pwd)}"

echo "--- Bootstrap Kibana"
export KBN_BOOTSTRAP_NO_PREBUILT=true
.buildkite/scripts/bootstrap.sh

REPORT_PATH="target/flaky_tests/flaky_tests.json"
SUMMARY_PATH="target/flaky_tests/ai_fixes.json"
download_artifact "$REPORT_PATH" . --step discover-flaky-tests

args=(
  --input "$REPORT_PATH"
  --summary-path "$SUMMARY_PATH"
  --github-repo elastic/kibana
  --max-requests "${FLAKY_FIXES_MAX_REQUESTS:-5}"
)
case "${FLAKY_FIXES_ENABLED:-false}" in
  true) args+=(--no-dry-run) ;;
  false) args+=(--dry-run) ;;
  *) echo "FLAKY_FIXES_ENABLED must be true or false" >&2; exit 1 ;;
esac

echo "+++ Select automatic flaky fixes"
rm -f "$SUMMARY_PATH"
exit_code=0
node scripts/request_flaky_test_fixes "${args[@]}" || exit_code=$?
if [[ -f "$SUMMARY_PATH" ]]; then
  buildkite-agent artifact upload "$SUMMARY_PATH"
  {
    jq -r '"Automatic flaky fixes in `\(.githubRepo)` (dry run: \(.dryRun)).",
      "",
      (.actions | group_by(.action)[] | "- \(.[0].action): \(length)"),
      "",
      "Open AI-fixable issues outside the report: \(.outsideReport | length).",
      "",
      (.actions[] | "- `\(.filePath)`: \(.action) - \(.reason)"
        + (if .issue then " ([elastic/kibana#\(.issue)](https://github.com/elastic/kibana/issues/\(.issue)))" else "" end))' "$SUMMARY_PATH"
    echo
    echo "Full decisions and sibling issues: <a href=\"artifact://${SUMMARY_PATH}\">${SUMMARY_PATH}</a>"
  } | buildkite-agent annotate --style "$([[ "$exit_code" == 0 ]] && echo info || echo error)" --context flaky-test-ai-fixes
fi
exit "$exit_code"
