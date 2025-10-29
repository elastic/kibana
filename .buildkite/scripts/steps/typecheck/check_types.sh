#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Retrieve cache if available
restore_target_folders

echo --- Check Types
set +e
node scripts/type_check --extendedDiagnostics > type_check.log
EXIT_CODE=$?
set -e

if [[ -f 'type_check.log' ]]; then
  tail -n 50 type_check.log
  buildkite-agent artifact upload type_check.log
fi

# Try to archive target folders for future caching
archive_target_folders

exit $EXIT_CODE
