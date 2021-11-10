#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest with coverage'
node scripts/jest --ci --maxWorkers=10 --coverage || true

echo '--- Jest Integration Tests with coverage'
node --max-old-space-size=5120 scripts/jest_integration  --ci --coverage || true

echo "--- Combine code coverage in a single report"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js