#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'

export NODE_OPTIONS="--max-old-space-size=8192"

if is_pr && ! is_auto_commit_disabled; then
  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 8 node scripts/eslint --no-cache --fix || [ $? -eq 1 ]
else
  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 8 node scripts/eslint --no-cache || [ $? -eq 1 ]
fi

eslint_status=$?
if [ $eslint_status -ne 0 ] && [ $eslint_status -ne 1 ]; then
  echo "ESLint failed with system error (exit code: $eslint_status)"
  exit $eslint_status
fi

desc="node scripts/eslint --no-cache"
if is_pr && ! is_auto_commit_disabled; then
  desc="$desc --fix"
fi

check_for_changed_files "$desc" true

if [[ "${eslint_status}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
