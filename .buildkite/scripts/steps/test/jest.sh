#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true

.buildkite/scripts/bootstrap.sh

echo '--- Jest'
node scripts/jest --ci --verbose --maxWorkers=13
