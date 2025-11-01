#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
set +e
node scripts/type_check --with-archive
EXIT_CODE=$?
set -e

if [[ -f 'type_check.log' ]]; then
  tail -n 50 type_check.log
  buildkite-agent artifact upload type_check.log
fi

exit $EXIT_CODE
