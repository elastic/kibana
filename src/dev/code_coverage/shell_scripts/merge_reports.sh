#!/bin/bash

set -e

# merge oss & x-pack reports
echo "### merging coverage reports"
yarn nyc report --temp-dir /tmp/extracted_coverage/target/kibana-coverage/jest --report-dir target/kibana-coverage/jest-combined --reporter=html --reporter=json-summary
yarn nyc report --temp-dir /tmp/extracted_coverage/target/kibana-coverage/functional --report-dir target/kibana-coverage/functional-combined --reporter=html --reporter=json-summary

echo "### Copy mocha reports"
mkdir -p target/kibana-coverage/mocha-combined
cp -r /tmp/extracted_coverage/target/kibana-coverage/mocha target/kibana-coverage/mocha-combined
