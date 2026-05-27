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
# Run read-only (no --fix) so CI never mutates the working tree.
timeout 1200 node scripts/check --scope branch --no-fix || EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 && $EXIT_CODE -ne 124 ]]; then
  FAILED=true
fi

if [[ "$FAILED" == "true" ]]; then
  buildkite-agent annotate \
    --style error \
    --context check \
    ":warning: **\`node scripts/check.js\` failed.** Run \`node scripts/check.js\` locally before pushing to catch these issues early."
fi

# Regenerate the full Moon project map and surface any drift. No auto-commit.
echo +++ node scripts/regenerate_moon_projects.js --update
node scripts/regenerate_moon_projects.js --update || true

MOON_CHANGES="$(git status --porcelain -- . ':!:config/node.options' ':!config/kibana.yml')"
if [[ -n "$MOON_CHANGES" ]]; then
  echo "Moon project regeneration produced changes:"
  echo "$MOON_CHANGES"
  buildkite-agent annotate \
    --style error \
    --context moon-projects \
    ":warning: **Moon projects are out of date.** Run \`node scripts/regenerate_moon_projects.js --update\` locally and commit the result."
  FAILED=true
fi

if [[ "$FAILED" == "true" ]]; then
  exit 1
fi
