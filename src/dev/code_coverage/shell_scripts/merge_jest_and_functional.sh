#!/bin/bash

EXTRACT_START_DIR=tmp/extracted_coverage
EXTRACT_END_DIR=target/kibana-coverage
COMBINED_EXTRACT_DIR=/${EXTRACT_START_DIR}/${EXTRACT_END_DIR}

set -e
function final() {
  set +e
  for x in jest functional; do
    echo "### List temp dir for: ${x}"
    ls -la $COMBINED_EXTRACT_DIR/${x}
    echo "### List report dir for: ${x}"
    ls -la $EXTRACT_END_DIR/${x}-combined
  done
}
trap 'final' EXIT

echo "### Merge coverage reports"
for x in jest functional; do
  yarn nyc report --temp-dir $COMBINED_EXTRACT_DIR/${x} --report-dir $EXTRACT_END_DIR/${x}-combined --reporter=html --reporter=json-summary
done
