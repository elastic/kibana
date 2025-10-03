#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if ! is_pr; then
  echo --- Not a PR branch, skipping Telemetry Schema checks.
  exit 0
fi

echo --- Check Telemetry Schema

if [[ -z "$GITHUB_PR_MERGE_BASE" ]]; then
  echo "❌ Cannot perform telemetry checks as GITHUB_PR_MERGE_BASE is not defined. Aborting. " >&2
  exit 1
fi

if ! is_auto_commit_disabled; then
  node scripts/telemetry_check --baseline "$GITHUB_PR_MERGE_BASE" --fix
  check_for_changed_files "node scripts/telemetry_check" true
else
  node scripts/telemetry_check
fi
