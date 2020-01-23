#!/bin/bash

set -e

DOWNLOAD_DIR=/tmp/downloaded_coverage
EXTRACT_DIR=/tmp/extracted_coverage

echo "### Extracting kibana-xpack-tests"
#for i in {1..3}; do
#  tar -xzf $DOWNLOAD_DIR/coverage/kibana-xpack-tests-${i}/kibana-coverage.tar.gz -C $EXTRACT_DIR
#done

# TODO-TRE: Uncomment the loop above, and remove the line below
tar -xzf $DOWNLOAD_DIR/coverage/kibana-xpack-tests-1/kibana-coverage.tar.gz -C $EXTRACT_DIR
