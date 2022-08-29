#!/usr/bin/env bash

set -euo pipefail

header() {
  local fileName=$1

  echo "" >"$fileName"

  echo "### File Name:" >>"$fileName"
  printf "  %s\n\n" "$fileName" >>"$fileName"
}

# $1 file name, ex: "target/dir-listing-jest.txt"
# $2 directory to be listed, ex: target/kibana-coverage/jest
dirListing() {
  local fileName=$1
  local dir=$2

  header "$fileName"

  ls -l "$dir" >>"$fileName"

  printf "\n### %s \n\tlisted to: %s\n" "$dir" "$fileName"

  buildkite-agent artifact upload "$fileName"

  printf "\n### %s Uploaded\n" "$fileName"
}

replacePaths() {
  local dirName=$1
  local search=$2
  local replace=$3

  for x in $(find "$dirName" -maxdepth 1 -type f -name '*.json'); do
    ts-node .buildkite/scripts/steps/code_coverage/clean_coverage_paths.ts \
      "$x" \
      "$search" \
      "$replace"
  done
}

fileHeads() {
  local fileName=$1
  local dir=$2
  local ext=${3:-'*.json'}

  header "$fileName"

  while read -r x; do
    printf "\n### BEGIN %s\n\n" "$x" >>"$fileName"
    head -2 "$x" >>"$fileName"
    printf "\n### END %s\n\n" "$x" >>"$fileName"
  done <<<"$(find "$dir" -maxdepth 1 -type f -name "$ext")"

  buildkite-agent artifact upload "$fileName"

  printf "\n### %s Uploaded\n" "$fileName"
}

collectAndUpload() {
  local fileName=$1
  local dir=$2

  tar -czf "$fileName" "$dir"

  buildkite-agent artifact upload "$fileName"

  printf "\n### %s Uploaded\n" "$fileName"
}

# Jest, Jest Integration, and FTR Configs will use this to "tell"
# the last stage they ran.
uploadRanFile() {
  local ran=$1

  mkdir -p target/ran_files

  local fileName="target/ran_files/$ran.txt"

  echo "$ran" >"$fileName"

  buildkite-agent artifact upload "$fileName"
}
