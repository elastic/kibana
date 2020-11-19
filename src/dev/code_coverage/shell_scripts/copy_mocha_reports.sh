#!/bin/bash

EXTRACT_START_DIR=tmp/extracted_coverage
EXTRACT_END_DIR=target/kibana-coverage
COMBINED_EXRACT_DIR=/${EXTRACT_START_DIR}/${EXTRACT_END_DIR}


echo "### Copy mocha reports"
mkdir -p $EXTRACT_END_DIR/mocha-combined
cp -r $COMBINED_EXRACT_DIR/mocha/. $EXTRACT_END_DIR/mocha-combined/
