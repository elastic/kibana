#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

echo "### Clone kibana to /dev/shm/workspace/"
mkdir -p /dev/shm/workspace/
cd ..
rsync -avz kibana /dev/shm/workspace/kibana
cd /dev/shm/workspace/kibana
echo "### bootstrap from x-pack folder"
# bootstrap from x-pack folder
cd x-pack
yarn kbn bootstrap
# Return to project root
cd ..
echo "### Merge coverage reports"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js
