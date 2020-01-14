#!/bin/bash

EXTRACT_START_DIR=tmp/extracted_coverage
EXTRACT_END_DIR=target/kibana-coverage
COMBINED_EXRACT_DIR=/${EXTRACT_START_DIR}/${EXTRACT_END_DIR}

echo "### Merge coverage reports"
for x in jest functional; do
  yarn nyc report --temp-dir $COMBINED_EXRACT_DIR/${x} --report-dir $EXTRACT_END_DIR/${x}-combined --reporter=html --reporter=json-summary
done
