#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export CODE_COVERAGE=1

base=target/kibana-coverage
target="$base/functional"
first="$target/first"
rest="$target/rest"

filesCount() {
  count=$(find "$1" -maxdepth 1 -type f | wc -l | xargs) # xargs trims whitespace
}

_head() {
  firstFile=$(find "$1" -maxdepth 1 -type f | head -1)
}

splitCoverage() {
  echo "--- Running splitCoverage:"
  filesCount "$1"
  echo "### total: $count"

  mkdir -p $first
  mkdir -p $rest
  half=$((count / 2))
  echo "### half: $half"

  echo "### Move the first half into the 'first' dir"
  # the index variable is irrelevant
  for x in $(seq 1 $half); do
    _head "$1"
    mv "$firstFile" "$first"
  done

  echo "### Move the second half into the 'rest' dir"
  while read -r x; do
    mv "$x" "$rest" || printf "\n\t### Trouble moving %s to %s" "$x" "$rest"
  done <<<"$(find "$target" -maxdepth 1 -type f -name '*.json')"
}

splitMerge() {
  echo "### Merge the 1st half of the coverage files"
  yarn nyc merge target/kibana-coverage/functional/first target/kibana-coverage/functional/first.json
  echo "### Merge the 2nd half of the coverage files"
  yarn nyc merge target/kibana-coverage/functional/rest target/kibana-coverage/functional/rest.json
  echo "### Report-Merge the 2 halves into one"
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js
}

uniqueifyFunctional() {
  local unique=${1:?"Must pass first positional arg for 'unique'"}

  # Drop the json files that where report-merged.
  rm -rf target/kibana-coverage/functional/*

  # Move from report-merge target dir, to: target/kibana-coverage/functional
  mv target/kibana-coverage/functional-combined/coverage-final.json \
    "target/kibana-coverage/functional/$unique-coverage-final.json"
}
