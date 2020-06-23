#!/bin/bash

EXTRACT_START_DIR=tmp/extracted_coverage
EXTRACT_END_DIR=target/kibana-coverage
COMBINED_EXRACT_DIR=/${EXTRACT_START_DIR}/${EXTRACT_END_DIR}

PWD=$(pwd)
du -sh $COMBINED_EXRACT_DIR

echo "### Jest: replacing path in json files"
for i in coverage-final xpack-coverage-final;  do
  sed -i "s|/dev/shm/workspace/kibana|${PWD}|g" $COMBINED_EXRACT_DIR/jest/${i}.json &
done
wait

echo "### Functional: replacing path in json files"
for i in {1..9}; do
  sed -i "s|/dev/shm/workspace/kibana|${PWD}|g" $COMBINED_EXRACT_DIR/functional/${i}*.json &
done
wait
