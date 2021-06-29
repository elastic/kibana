#!/bin/bash

EXTRACT_START_DIR=tmp/extracted_coverage
EXTRACT_END_DIR=target/kibana-coverage
COMBINED_EXRACT_DIR=/${EXTRACT_START_DIR}/${EXTRACT_END_DIR}


echo "### Copy combined jest report"
mkdir -p $EXTRACT_END_DIR/jest-combined
cp -r $COMBINED_EXRACT_DIR/jest-combined/. $EXTRACT_END_DIR/jest-combined/
