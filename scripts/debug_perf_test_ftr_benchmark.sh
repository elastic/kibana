#!/bin/bash

MOCK_FILE_PATH=$1

echo ""

if [ -z "$MOCK_FILE_PATH" ]; then
  echo "### MOCK_FILE_PATH: ${MOCK_FILE_PATH}, doesnt quack like a path!"
  exit 1
else
  echo "### MOCK_FILE_PATH: ${MOCK_FILE_PATH}"
fi

echo ""

REMOVE="o.e.n.Node"
#eval cat src/dev/perf_test_ftr/__tests__/__mocks__/ftr_output_run_638_targeted_lines_and_blank_lines.txt | while read -r LINE; do
eval cat $MOCK_FILE_PATH | while read LINE; do
  node scripts/perf_test_ftr_benchmark.js --verbose --line "${LINE}"
done
