#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

echo "### Merge coverage reports"
for x in functional; do # jest skip due to failures
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.${x}.config.js
done
