#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

# disable "Exit immediately" mode so that we can run oxlint, eslint and oxfmt, capture their exit
# codes, and respond appropriately after possibly commiting fixed files to the repo.
# oxfmt runs last so that it formats any oxlint/eslint autofixes in the same pass.
set +e;
if is_pr && ! is_auto_commit_disabled; then
  fix_flag="--fix"
  oxfmt_flag=""
else
  fix_flag=""
  oxfmt_flag="--check"
fi

echo '--- Lint: oxlint'
node scripts/lint.js --quiet $fix_flag
oxlint_exit=$?

echo '--- Lint: eslint'
node scripts/eslint_all_files --no-cache $fix_flag
eslint_exit=$?

echo '--- Lint: oxfmt'
node scripts/oxfmt $oxfmt_flag
oxfmt_exit=$?
# re-enable "Exit immediately" mode
set -e;

desc="node scripts/lint.js --quiet $fix_flag && node scripts/eslint_all_files --no-cache $fix_flag && node scripts/oxfmt $oxfmt_flag"
check_for_changed_files "$desc" true

if [[ "${oxlint_exit}" != "0" ]]; then
  echo "oxlint ❌"
fi
if [[ "${eslint_exit}" != "0" ]]; then
  echo "eslint ❌"
fi
if [[ "${oxfmt_exit}" != "0" ]]; then
  echo "oxfmt ❌"
fi
if [[ "${oxlint_exit}" != "0" || "${eslint_exit}" != "0" || "${oxfmt_exit}" != "0" ]]; then
  exit 1
fi

echo "oxlint ✅"
echo "eslint ✅"
echo "oxfmt ✅"
