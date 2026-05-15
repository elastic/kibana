#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- check

.buildkite/scripts/bootstrap.sh

FAILED=false
node scripts/check --scope branch || FAILED=true

if [[ "$FAILED" == "true" ]]; then
  buildkite-agent annotate \
    --style error \
    --context check \
    ":warning: **\`node scripts/check\` failed.** Run \`node scripts/check\` locally before pushing to catch these issues early."
fi

if is_pr && ! is_auto_commit_disabled; then
  check_for_changed_files "node scripts/check" true
fi

if [[ "$FAILED" == "true" ]]; then
  exit 1
fi
