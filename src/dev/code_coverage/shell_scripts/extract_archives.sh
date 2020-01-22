#!/bin/bash

set -e

mkdir -p /tmp/extracted_coverage

echo "### Extracting intakes"
tar -xzf /tmp/downloaded_coverage/coverage/kibana-intake/kibana-coverage.tar.gz -C /tmp/extracted_coverage
tar -xzf /tmp/downloaded_coverage/coverage/x-pack-intake/kibana-coverage.tar.gz -C /tmp/extracted_coverage

echo "### Extracting kibana-oss-tests"
tar -xzf /tmp/downloaded_coverage/coverage/kibana-oss-tests/kibana-coverage.tar.gz -C /tmp/extracted_coverage
