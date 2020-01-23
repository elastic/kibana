#!/bin/bash

set -e

DOWNLOAD_DIR=/tmp/downloaded_coverage
EXTRACT_DIR=/tmp/extracted_coverage

mkdir -p $EXTRACT_DIR

echo "### Extracting downloaded artifacts"
# TODO-TRE: Prolly need to update the numbered kibana-xpack-tests-NUMBER later.
for x in kibana-intake kibana-oss-tests kibana-xpack-tests-1 x-pack-intake; do
  tar -xzf $DOWNLOAD_DIR/kibana-coverage/${x}/kibana-coverage.tar.gz -C $EXTRACT_DIR
done

