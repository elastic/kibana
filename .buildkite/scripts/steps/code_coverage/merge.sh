#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

export CODE_COVERAGE=1

base=target/kibana-coverage
target="$base/functional"
first="$target/first"
rest="$target/rest"

filesCount() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    count=$(find "$1" -maxdepth 1 -type f | grep -vc ".DS*" | xargs) # xargs trims whitespace
  else
    count=$(find "$1" -maxdepth 1 -type f | wc -l | xargs) # xargs trims whitespace
  fi
}

_head() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    count=$(find "$1" -maxdepth 1 -type f | grep -vc ".DS*" | xargs) # xargs trims whitespace
    firstFile=$(find "$1" -maxdepth 1 -type f | grep -v ".DS*" | head -1)
  else
    count=$(find "$1" -maxdepth 1 -type f | wc -l | xargs) # xargs trims whitespace
    firstFile=$(find "$1" -maxdepth 1 -type f | head -1)
  fi
}

splitCoverage() {
  echo "--- Running splitCoverage"
  filesCount "$1"
  echo "### total: $count"

  mkdir -p $first
  mkdir -p $rest
  half=$((count / 2))
  echo "### half: $half"

  echo "--- Move the first half into the 'first' dir"
  # the index variable is irrelevant
  for x in $(seq 1 $half); do
    _head "$1"
    mv "$firstFile" "$first"
  done

  echo "--- Move the second half into the 'rest' dir"
  while read -r x; do
    mv "$x" "$rest" || printf "\n\t### Trouble moving %s to %s" "$x" "$rest"
  done <<<"$(find "$target" -maxdepth 1 -type f -name '*.json')"
}

splitMerge() {
  echo "--- Merge the 1st half of the coverage files"
  yarn nyc merge target/kibana-coverage/functional/first target/kibana-coverage/functional/first.json
  echo "--- Merge the 2nd half of the coverage files"
  yarn nyc merge target/kibana-coverage/functional/rest target/kibana-coverage/functional/rest.json
  echo "--- Report-Merge the 2 halves into one"
  yarn nyc report --nycrc-path src/dev/code_coverage/nyc_config/nyc.functional.config.js
}

listReports() {
  ls -R $base
}
