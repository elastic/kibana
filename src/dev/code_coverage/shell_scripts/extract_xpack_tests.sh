#!/bin/bash

DOWNLOAD_DIR=/tmp/downloaded_coverage
EXTRACT_DIR=/tmp/extracted_coverage

echo "### Extracting kibana-xpack-tests"
for i in {1..3}; do
  tar -xzf $DOWNLOAD_DIR/coverage/kibana-xpack-tests-${i}/kibana-coverage.tar.gz -C $EXTRACT_DIR
done
