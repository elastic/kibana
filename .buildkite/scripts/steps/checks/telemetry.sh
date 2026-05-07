#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Telemetry Schema

export CHECK_GIT_PATHSPEC="src/platform/plugins/shared/telemetry/schema/ x-pack/platform/plugins/private/telemetry_collection_xpack/schema/"

if is_pr && ! is_auto_commit_disabled; then
  node scripts/telemetry_check --baseline "${GITHUB_PR_MERGE_BASE:-}" --fix
  yarn test:jest src/platform/plugins/shared/telemetry/schema/schema_checks.test.ts -u
  check_for_changed_files "node scripts/telemetry_check" true
elif is_pr; then
  node scripts/telemetry_check --baseline "${GITHUB_PR_MERGE_BASE:-}"
else
  # assume on-merge pipeline
  node scripts/telemetry_check --baseline "${BUILDKITE_BRANCH:-main}"
fi
