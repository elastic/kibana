#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- Jest'
node scripts/jest --ci --verbose --maxWorkers=13
