#!/bin/bash

set -e

# replace path in json files to have valid html report
PWD=$(pwd)
du -sh /tmp/extracted_coverage/target/kibana-coverage/

echo "### Replacing path in json files"
for i in {1..9}; do
  sed -i "s|/dev/shm/workspace/kibana|${PWD}|g" /tmp/extracted_coverage/target/kibana-coverage/functional/${i}*.json &
done
wait
