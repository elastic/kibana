#!/bin/bash

DOWNLOAD_DIR=/tmp/downloaded_coverage
EXTRACT_DIR=/tmp/extracted_coverage

mkdir -p $EXTRACT_DIR

echo "### Extracting downloaded artifacts"
for x in kibana-intake x-pack-intake kibana-oss-tests kibana-xpack-tests; do
  tar -xzf $DOWNLOAD_DIR/coverage/${x}/kibana-coverage.tar.gz -C $EXTRACT_DIR || echo "### Error 'tarring': ${x}"
done

