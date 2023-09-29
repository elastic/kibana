#!/usr/bin/env bash

set -euo pipefail

# This script will collect typescript projects and run typecheck on projects between the given 2 parameters
# Could be used for selective typechecking on projects that might be affected for a given PR.
# (The accuracy for finding related projects is not a 100%)

if [[ "${CI-}" == "true" ]]; then
  .buildkite/scripts/bootstrap.sh

  sha1=$(git merge-base $GITHUB_PR_TARGET_BRANCH $GITHUB_PR_TRIGGERED_SHA)
  sha2="${GITHUB_PR_TRIGGERED_SHA-}"
else
  if [[ "${1-}" == "--cached" ]]; then
    # Only check staged files
    sha1=$1
    sha2=""
  else
    # Script take between 0 and 2 arguments representing two commit SHA's:
    # If 0, it will diff HEAD and HEAD^
    # If 1 (SHA1), it will diff SHA1 and SHA1^
    # If 2 (SHA1, SHA2), it will diff SHA1 and SHA2
    sha1="${1-HEAD}"
    sha2="${2-$sha1^}"
  fi
fi

uniq_dirs=()
uniq_tsconfigs=()

if [[ "$sha1" == "--cached" ]]; then
  echo "Detecting files changed in staging area..."
else
  echo "Detecting files changed between $sha1 and $sha2..."
fi

files=($(git diff --name-only $sha1 $sha2))

add_dir () {
  new_dir=$1

  if [ ${#uniq_dirs[@]} -gt 0 ]; then
    for dir in "${uniq_dirs[@]}"
    do
      if [[ "$new_dir" == "$dir" ]]; then
        return
      fi
    done
  fi

  uniq_dirs+=($new_dir)
}

add_tsconfig () {
  new_tsconfig=$1

  if [ ${#uniq_tsconfigs[@]} -gt 0 ]; then
    for tsconfig in "${uniq_tsconfigs[@]}"
    do
      if [[ "$new_tsconfig" == "$tsconfig" ]]; then
        return
      fi
    done
  fi

  echo "  $new_tsconfig"
  uniq_tsconfigs+=($new_tsconfig)
}

contains_tsconfig () {
  dir=$1
  tsconfig="$dir/tsconfig.json"
  if [ -f "$tsconfig" ]; then
    true
  else
    false
  fi
}

find_tsconfig () {
  dir=$1

  if [[ "$dir" == "." ]]; then
    return
  fi

  if contains_tsconfig $dir; then
    add_tsconfig "$dir/tsconfig.json"
  else
    find_tsconfig $(dirname -- "$dir")
  fi
}

if [ ${#files[@]} -eq 0 ]; then
  echo "No files found!"
  exit
fi

for file in "${files[@]}"
do
  dir=$(dirname -- "$file")

  # Ignore buildkite dir because it traverses many kbn packages and emits incorrect results
  if [[ "$dir" != .buildkite* ]]; then
    add_dir $dir
  fi
done

echo "Looking for related tsconfig.json files..."

if [ ${#uniq_dirs[@]} -gt 0 ]; then
  for dir in "${uniq_dirs[@]}"
  do
    find_tsconfig $dir
  done
fi

if [ ${#uniq_tsconfigs[@]} -eq 0 ]; then
  if [[ "$sha1" == "--cached" ]]; then
    echo "No tsconfig.json files found for staged changes"
  else
    echo "No tsconfig.json files found for changes between $sha1 and $sha2"
  fi
  exit
fi

echo "Running scripts/type_check for each found tsconfig.json file..."

finalExitCode=0

for tsconfig in "${uniq_tsconfigs[@]}"
do
  set +e
  node scripts/type_check --project $tsconfig
  exitCode=$?
  set -e
  if [ "$exitCode" -gt "$finalExitCode" ]; then
    finalExitCode=$exitCode
  fi
done

exit $finalExitCode
