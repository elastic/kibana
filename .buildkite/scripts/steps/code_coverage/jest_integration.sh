#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest Integration code coverage'
node --max-old-space-size=14336 scripts/jest_integration  --ci --coverage --coverageReporters json || true
mv target/kibana-coverage/jest/coverage-final.json "target/kibana-coverage/jest/jest-integration-coverage.json"