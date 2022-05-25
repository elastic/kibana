#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/code_coverage/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

echo '--- Jest code coverage'

.buildkite/scripts/steps/code_coverage/jest_parallel.sh jest.config.js

tar -czf kibana-jest-thread-coverage.tar.gz target/kibana-coverage/jest

echo "--- Merging code coverage for a thread"
# Nyc uses matching absolute paths for reporting / merging
# So, set all coverage json files to a specific prefx.
# The prefix will be changed to the kibana dir, in the final stage,
# so nyc doesnt error.
echo "--- Normalize file paths prefix"
replacePaths "$KIBANA_DIR/target/kibana-coverage/jest" "$KIBANA_DIR" "CC_REPLACEMENT_ANCHOR"
fileHeads "target/file-heads-jest-after-parallel-and-after-replacement.txt" target/kibana-coverage/jest

yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.jest.config.js --reporter json

fileHeads "target/file-heads-jest-after-parallel-and-after-replacement-and-after-merge.txt" target/kibana-coverage/jest
rm -rf target/kibana-coverage/jest/*
mv target/kibana-coverage/jest-combined/coverage-final.json "target/kibana-coverage/jest/jest-merged-coverage-$(date +%s%3N).json"
dirListing "target/dir-listing-jest-combined.txt" target/kibana-coverage/jest-combined
fileHeads "target/file-heads-jest-combined.txt" target/kibana-coverage/jest-combined

# So the last step "knows" this config ran
uploadRanFile "jest"
