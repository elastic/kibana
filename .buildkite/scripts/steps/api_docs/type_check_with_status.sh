#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
set +e
node scripts/type_check
TYPE_CHECK_RESULT=$?
echo Type check exited with status $TYPE_CHECK_RESULT
set -e

if [[ $TYPE_CHECK_RESULT -ne 0 ]]; then
  echo "Type check failed - setting status to failure"
  buildkite-agent meta-data set "type_check_status" "failure"
else
  echo "Type check passed - setting status to success"
  buildkite-agent meta-data set "type_check_status" "success"
fi

exit $TYPE_CHECK_RESULT
