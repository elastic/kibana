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
  moon ci :lint -- --fix
else
  moon ci :lint
fi

eslint_exit=$?
# re-enable "Exit immediately" mode
set -e;

desc="moon ci :lint"
if is_pr && ! is_auto_commit_disabled; then
  desc="$desc -- --fix"
fi

check_for_changed_files "$desc" true

if [[ "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "eslint ✅"
