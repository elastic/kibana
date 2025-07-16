#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'
# disable "Exit immediately" mode so that we can run eslint, capture it's exit code, and respond appropriately
# after possibly commiting fixed files to the repo
set +e;
if is_pr && ! is_auto_commit_disabled; then
  desc="node scripts/eslint_all_files --no-cache --fix"
  node scripts/eslint_all_files --no-cache --fix
else
  desc="node scripts/eslint_all_files --no-cache"
  node scripts/eslint_all_files --no-cache
fi

eslint_exit=$?
# re-enable "Exit immediately" mode
set -e;

check_for_changed_files "$desc" true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"

echo '--- Security: check 3rd-party dependencies'

if is_pr && ! is_auto_commit_disabled; then
  ts-node .buildkite/scripts/steps/security/dependencies_diff.ts
fi

check_for_changed_files "security: 3rd-party dependencies" true

echo "security: check 3rd-party dependencies ✅"
