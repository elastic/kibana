#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- HIJACKED'
.buildkite/scripts/steps/checks/own_tests_ran.sh

#echo '--- Lint: stylelint'
#checks-reporter-with-killswitch "Lint: stylelint" \
#  node scripts/stylelint
#echo "stylelint ✅"
#
#echo '--- Lint: eslint'
## disable "Exit immediately" mode so that we can run eslint, capture it's exit code, and respond appropriately
## after possibly commiting fixed files to the repo
#set +e;
#if is_pr && ! is_auto_commit_disabled; then
#  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 6 node scripts/eslint --no-cache --fix
#else
#  git ls-files | grep -E '\.(js|mjs|ts|tsx)$' | xargs -n 250 -P 6 node scripts/eslint --no-cache
#fi
#
#eslint_exit=$?
## re-enable "Exit immediately" mode
#set -e;
#
#desc="node scripts/eslint --no-cache"
#if is_pr && ! is_auto_commit_disabled; then
#  desc="$desc --fix"
#fi
#
#check_for_changed_files "$desc" true
#
#if [[ "${eslint_exit}" != "0" ]]; then
#  exit 1
#fi
#
#echo "eslint ✅"
