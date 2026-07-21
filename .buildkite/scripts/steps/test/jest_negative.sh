#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest runner negative testing'
# Feeds deliberately-failing canary configs to scripts/jest_all and inverts the result:
# the runner must report each failure. Exits non-zero if any canary is not caught.
node scripts/jest_negative
