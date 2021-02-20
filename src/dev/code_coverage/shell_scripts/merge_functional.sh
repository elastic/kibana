#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

checkoutDir="$(pwd)"
echo  "checkoutDir=${checkoutDir}"

echo "### Clone kibana to /dev/shm/workspace/"
mkdir -p /dev/shm/workspace/kibana
rsync -ahSD --ignore-errors --force --delete --stats ./ /dev/shm/workspace/kibana/
cd /dev/shm/workspace/kibana
echo "### Show folders tree"
ls -d -- */
echo "### bootstrap from x-pack folder"
# bootstrap from x-pack folder
cd x-pack
yarn kbn bootstrap
# Return to project root
cd ..
echo "### Merge coverage reports"
yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js

rsync -ahSD --ignore-errors --force --delete --stats target "$checkoutDir/"

echo "### Back to $checkoutDir"
cd "$checkoutDir"
ls -als
