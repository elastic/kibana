#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

echo "### Merge coverage reports"
for x in jest functional; do
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.${x}.config.js
done
