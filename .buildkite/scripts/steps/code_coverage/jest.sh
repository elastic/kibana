#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest with coverage'
node --max-old-space-size=6144 scripts/jest --ci --maxWorkers=10 --coverage --coverageReporters json || true

# change name so report won't be overwritten
mv target/kibana-coverage/jest/coverage-final.json ./target/kibana-coverage/jest/coverage-jest.json

echo '--- Jest Integration Tests with coverage'
node --max-old-space-size=5120 scripts/jest_integration  --ci --coverage --coverageReporters json || true

echo "--- Combine code coverage in a single report"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js

echo "--- Archive combined jest report"
tar -czf target/kibana-coverage/kibana-coverage.tar.gz target/kibana-coverage/jest-combined