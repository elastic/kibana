#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Jest'
checks-reporter-with-killswitch "Jest Unit Tests" \
  node scripts/jest --ci --verbose --maxWorkers=13
