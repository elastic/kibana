#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- Jest Integration Tests'
node scripts/jest_integration --ci --verbose
