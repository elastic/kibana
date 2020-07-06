#!/bin/bash

DOWNLOAD_DIR=/tmp/downloaded_coverage
EXTRACT_DIR=/tmp/extracted_coverage

echo "### Extracting kibana-xpack-tests"
tar -xzf $DOWNLOAD_DIR/coverage/kibana-xpack-tests/kibana-coverage.tar.gz -C $EXTRACT_DIR
