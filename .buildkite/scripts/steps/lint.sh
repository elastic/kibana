#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'
# disable "Exit immediately" mode so that we can run eslint and oxfmt, capture their exit codes,
# and respond appropriately after possibly committing fixed files to the repo.
# oxfmt runs last so that it formats any eslint autofixes in the same pass.
set +e;
if is_pr && ! is_auto_commit_disabled; then
  desc="node scripts/eslint_all_files --no-cache --fix && node scripts/oxfmt"
  oxfmt_flag=""
  node scripts/eslint_all_files --no-cache --fix
else
  desc="node scripts/eslint_all_files --no-cache && node scripts/oxfmt --check"
  oxfmt_flag="--check"
  node scripts/eslint_all_files --no-cache
fi

eslint_exit=$?

echo '--- Lint: oxfmt'
node scripts/oxfmt $oxfmt_flag
oxfmt_exit=$?
# re-enable "Exit immediately" mode
set -e;

check_for_changed_files "$desc" true

if [[ "${eslint_exit}" != "0" ]]; then
  echo "eslint ❌"
fi
if [[ "${oxfmt_exit}" != "0" ]]; then
  echo "oxfmt ❌"
fi
if [[ "${eslint_exit}" != "0" || "${oxfmt_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
echo "oxfmt ✅"
