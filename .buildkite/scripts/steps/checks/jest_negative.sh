#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Jest Runner Negative Testing
# Feeds deliberately-failing canary configs to scripts/jest_all and inverts the result:
# the runner must report each failure. Exits non-zero if any canary is not caught.
node scripts/jest_negative
