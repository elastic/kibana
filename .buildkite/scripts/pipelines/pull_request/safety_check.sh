#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo '--- Bootstrap Kibana'
export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh

echo '--- Collect changed files'
MERGE_BASE="${GITHUB_PR_MERGE_BASE:-$(git merge-base HEAD origin/main)}"
CHANGED_FILES=$(git diff --name-only "$MERGE_BASE" HEAD)

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No changed files detected, nothing to check."
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

LINT_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(js|mjs|ts|tsx|jsx)$' || true)

echo '--- Lint: eslint (changed files only)'
if [[ -n "$LINT_FILES" ]]; then
  # shellcheck disable=SC2086
  node scripts/eslint --no-cache $LINT_FILES
  echo "eslint ✅"
else
  echo "No lintable files changed, skipping eslint."
fi

echo '--- Quick Checks (subset)'
node scripts/quick_checks --file .buildkite/scripts/steps/checks/quick_checks_safety.json
echo "quick_checks ✅"

echo '--- Type Check'
node scripts/type_check --with-archive
echo "type_check ✅"
