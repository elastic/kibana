#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

checkoutDir="$(pwd)"
echo  "### checkoutDir=${checkoutDir}"

coverageBasePath="/dev/shm/workspace"
echo "### Clone kibana to ${coverageBasePath}"
mkdir -p "$coverageBasePath/kibana"
rsync -ahSD --ignore-errors --force --delete --stats ./ "$coverageBasePath/kibana/"
cd "$coverageBasePath/kibana"

echo "### bootstrap"
yarn kbn bootstrap
echo "### Merge coverage reports"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js

echo "### Copy 'target' to ${checkoutDir}"
rsync -ahSD --ignore-errors --force --delete --stats target "$checkoutDir/"

echo "### Back to $checkoutDir"
cd "$checkoutDir"
