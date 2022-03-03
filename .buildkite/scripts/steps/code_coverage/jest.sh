#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest code coverage'

.buildkite/scripts/steps/code_coverage/jest_parallel.sh jest.config.js

tar -czf kibana-jest-thread-coverage.tar.gz target/kibana-coverage/jest

echo "--- Merging code coverage for a thread"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js --reporter json
rm -rf target/kibana-coverage/jest/*
mv target/kibana-coverage/jest-combined/coverage-final.json "target/kibana-coverage/jest/jest-merged-coverage-$(date +%s%3N).json"
