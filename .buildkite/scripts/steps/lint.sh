#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'
# disable "Exit immediately" mode so that we can run eslint, capture it's exit code, and respond appropriately
# after possibly commiting fixed files to the repo
set +e;
if is_pr && ! is_auto_commit_disabled; then
  CHANGED_FILES=$(git diff --name-only --diff-filter=d "$(git merge-base HEAD origin/main)"..HEAD -- '*.js' '*.jsx' '*.ts' '*.tsx' | tr '\n' ' ')

  if [[ -n "$CHANGED_FILES" ]]; then
    desc="node scripts/eslint --cache --fix $CHANGED_FILES"
    node scripts/eslint --cache --fix $CHANGED_FILES
  else
    echo "No JS/TS files changed — skipping eslint"
    eslint_exit=0
  fi
elif is_pr; then
  CHANGED_FILES=$(git diff --name-only --diff-filter=d "$(git merge-base HEAD origin/main)"..HEAD -- '*.js' '*.jsx' '*.ts' '*.tsx' | tr '\n' ' ')

  if [[ -n "$CHANGED_FILES" ]]; then
    desc="node scripts/eslint --cache $CHANGED_FILES"
    node scripts/eslint --cache $CHANGED_FILES
  else
    echo "No JS/TS files changed — skipping eslint"
    eslint_exit=0
  fi
else
  desc="node scripts/eslint_all_files --no-cache"
  node scripts/eslint_all_files --no-cache
fi

eslint_exit=${eslint_exit:-$?}
# re-enable "Exit immediately" mode
set -e;

check_for_changed_files "${desc:-eslint}" true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
