#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

echo "### Merge coverage reports"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js
