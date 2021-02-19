#!/bin/bash

COVERAGE_TEMP_DIR=/tmp/extracted_coverage/target/kibana-coverage/
export COVERAGE_TEMP_DIR

checkoutDir="$(pwd)"
echo  "checkoutDir=${checkoutDir}"

echo "### Clone kibana to /dev/shm/workspace/"
mkdir -p /dev/shm/workspace/kibana
# rsync -avz kibana /dev/shm/workspace/kibana
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

echo "### zip functional combined report"
tar -czf kibana-functional-coverage.tar.gz target/kibana-coverage/functional-combined/*

echo "### Copy archive to checkoutDir"
cp kibana-functional-coverage.tar.gz $checkoutDir
