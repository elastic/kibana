#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- check

.buildkite/scripts/bootstrap.sh

echo +++ node scripts/check

FAILED=false
EXIT_CODE=0

# Large changes can cause this to run long. Cap at 20 minutes since the goal
# is early failure detection; the full jest suite runs separately in CI.
timeout 1200 node scripts/check --scope branch || EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 && $EXIT_CODE -ne 124 ]]; then
  FAILED=true
fi

if [[ "$FAILED" == "true" ]]; then
  buildkite-agent annotate \
    --style error \
    --context check \
    ":warning: **\`node scripts/check.js\` failed.** Run \`node scripts/check.js\` locally before pushing to catch these issues early."
fi

if is_pr && ! is_auto_commit_disabled; then
  check_for_changed_files "node scripts/check" true
fi

if [[ "$FAILED" == "true" ]]; then
  exit 1
fi
