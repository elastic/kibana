#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

resolveCurrentServerlessReleaseSha() {
  local serverless_release_rev
  local serverless_release_sha

  if ! serverless_release_rev="$(node scripts/get_serverless_release_sha)"; then
    echo "❌ Couldn't determine current serverless release SHA. Aborting Saved Objects checks" >&2
    exit 1
  fi

  if ! serverless_release_sha="$(git rev-parse "$serverless_release_rev")"; then
    echo "❌ Couldn't expand current serverless release SHA. Aborting Saved Objects checks." >&2
    exit 1
  fi

  if [[ -z "$serverless_release_sha" ]]; then
    echo "❌ Couldn't expand current serverless release SHA. Aborting Saved Objects checks." >&2
    exit 1
  fi

  echo "$serverless_release_sha"
}

echo --- Check changes in Saved Objects

if is_pr; then
  # We are on the 'pull_request' pipeline. Pass the merge-base SHA to the CLI;
  # snapshot resolution (retries + limited ancestor walk) happens in JavaScript.
  SERVERLESS_BASELINE_FLAG=()
  if [[ "$GITHUB_PR_TARGET_BRANCH" == "main" ]]; then
    GITHUB_SERVERLESS_RELEASE_SHA="$(resolveCurrentServerlessReleaseSha)"
    SERVERLESS_BASELINE_FLAG=(--serverless-baseline "$GITHUB_SERVERLESS_RELEASE_SHA")
  fi

  SO_REPORT_PATH="$(mktemp -t so-check-report.XXXXXX).json"
  CHECK_EXIT=0

  if ! is_auto_commit_disabled; then
    # The step might update files like removed_types.json and/or SO fixtures.
    # `check_for_changed_files` runs unconditionally so that any files produced by --fix
    # are auto-committed even when the check also reports non-fixable violations.
    node scripts/check_saved_objects --baseline "$GITHUB_PR_MERGE_BASE" "${SERVERLESS_BASELINE_FLAG[@]}" --algorithm both --report-path "$SO_REPORT_PATH" --fix || CHECK_EXIT=$?
    check_for_changed_files "node scripts/check_saved_objects" true
  else
    node scripts/check_saved_objects --baseline "$GITHUB_PR_MERGE_BASE" "${SERVERLESS_BASELINE_FLAG[@]}" --algorithm both --report-path "$SO_REPORT_PATH" || CHECK_EXIT=$?
  fi

  echo --- Post Saved Objects PR comment
  ts-node .buildkite/scripts/steps/checks/notify_saved_objects_changes.ts --report-path "$SO_REPORT_PATH" || echo "Warning: failed to post Saved Objects PR notification"

  if [[ "$CHECK_EXIT" -ne 0 ]]; then
    exit "$CHECK_EXIT"
  fi
else
  # We are on the 'on-merge' pipeline, the goal is to test against current serverless release,
  # and ONLY if we are in the main branch (older versions most likely won't be compatible)
  if [[ "$GITHUB_PR_TARGET_BRANCH" == "main" ]]; then
    GITHUB_SERVERLESS_RELEASE_SHA="$(resolveCurrentServerlessReleaseSha)"
    # Perform the check against current serverless release
    node scripts/check_saved_objects --baseline "$GITHUB_SERVERLESS_RELEASE_SHA" --algorithm both
  fi
fi
