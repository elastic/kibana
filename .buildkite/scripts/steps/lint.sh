#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
checks-reporter-with-killswitch "Lint: stylelint" \
  node scripts/stylelint
echo "stylelint ✅"

echo '--- Lint: eslint'
# run eslint in a subshell so that we can record it's exit value and react accordingly after possibly
# commiting changes caused by --fix
(checks-reporter-with-killswitch "Lint: eslint" \
  node scripts/eslint --no-cache --fix)

eslint_exit=$?

check_for_changed_files 'node scripts/eslint --no-cache --fix' true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi
echo "eslint ✅"
