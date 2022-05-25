#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

JOB=${BUILDKITE_PARALLEL_JOB:-0}

echo '--- Jest Integration code coverage'
.buildkite/scripts/steps/code_coverage/jest_parallel.sh jest.integration.config.js
mv target/kibana-coverage/jest/coverage-final.json "target/kibana-coverage/jest/jest-integration-coverage.json"

echo "--- Merging code coverage for a thread"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js --reporter json
rm -rf target/kibana-coverage/jest/*
mv target/kibana-coverage/jest-combined/coverage-final.json "target/kibana-coverage/jest/jest-merged-coverage-$(date +%s%3N).json"

# So the last step "knows" this config ran
uploadRanFile "jest_integration"
