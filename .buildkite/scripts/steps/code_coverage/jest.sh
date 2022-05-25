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
  fileHeads "target/file-heads-jest-after-thread-merge-before-jest-dir-delete.txt" target/kibana-coverage/jest
  dirListing "target/dir-listing-jest-after-thread-merge-before-jest-dir-delete.txt" target/kibana-coverage/jest
rm -rf target/kibana-coverage/jest/*
  fileHeads "target/file-heads-jest-combined-after-thread-merge-after-jest-dir-delete.txt" target/kibana-coverage/jest-combined
  dirListing "target/dir-listing-jest-combined-after-thread-merge-after-jest-dir-delete.txt" target/kibana-coverage/jest-combined
mv target/kibana-coverage/jest-combined/coverage-final.json "target/kibana-coverage/jest/jest-merged-coverage-$(date +%s%3N).json"
