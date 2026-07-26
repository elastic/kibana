#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: oxlint'
# disable "Exit immediately" mode so that we can run oxlint,
# capture it's exit code, and respond appropriately
# after possibly commiting fixed files to the repo
set +e;
if is_pr && ! is_auto_commit_disabled; then
  desc="node scripts/lint.js --fix"
  node scripts/lint.js --fix
else
  desc="node scripts/lint.js"
  node scripts/lint.js
fi

oxlint_exit=$?
# re-enable "Exit immediately" mode
set -e;

check_for_changed_files "$desc" true

if [[ "${oxlint_exit}" != "0" ]]; then
  exit 1
fi

echo "oxlint ✅"
