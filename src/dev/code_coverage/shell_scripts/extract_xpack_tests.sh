#!/bin/bash

set -e

echo "### Extracting kibana-xpack-tests"
for i in {1..3}; do
  tar -xzf /tmp/downloaded_coverage/coverage/kibana-xpack-tests-${i}/kibana-coverage.tar.gz -C /tmp/extracted_coverage
done

tar -xzf /tmp/downloaded_coverage/coverage/kibana-xpack-tests-1/kibana-coverage.tar.gz -C /tmp/extracted_coverage
