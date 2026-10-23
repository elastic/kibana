#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- check

.buildkite/scripts/bootstrap.sh

echo +++ node scripts/check

FAILED=false
AUTOFIX_EXIT_CODE=0
EXIT_CODE=0

# Run the fast fix-producing steps first (tsproj, moon, oxlint, lint) and auto-commit
# any changes immediately before running affected jest and tsc.
node scripts/check --scope branch --only tsproj,moon,oxlint,lint || AUTOFIX_EXIT_CODE=$?

if [[ $AUTOFIX_EXIT_CODE -ne 0 ]]; then
  FAILED=true
fi

if is_pr && ! is_auto_commit_disabled; then
  check_for_changed_files "node scripts/check" true
fi

# Large changes can cause this to run long. Cap at 20 minutes since the goal
# is early failure detection; the full jest suite runs separately in CI.
timeout 1200 node scripts/check --scope branch --skip tsproj,moon,oxlint,lint || EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 && $EXIT_CODE -ne 124 ]]; then
  FAILED=true
fi

if [[ "$FAILED" == "true" ]]; then
  buildkite-agent annotate \
    --style error \
    --context check \
    ":warning: **\`node scripts/check.js\` failed.** Run \`node scripts/check.js\` locally before pushing to catch these issues early."
  exit 1
fi
