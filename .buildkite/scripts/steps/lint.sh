#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
checks-reporter-with-killswitch "Lint: stylelint" \
  node scripts/stylelint
echo "stylelint ✅"

# disable "Exit immediately" mode so that we can run eslint, capture it's exit code, and respond appropriately
# after possibly commiting fixed files to the repo
set +e;

echo '--- Lint: eslint'
checks-reporter-with-killswitch "Lint: eslint" \
  node scripts/eslint --no-cache --fix

eslint_exit=$?

# re-enable "Exit immediately" mode
set -e;

check_for_changed_files 'node scripts/eslint --no-cache --fix' true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
