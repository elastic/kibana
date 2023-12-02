#!/usr/bin/env bash

set -euo pipefail

# This script detects the files changed in a given set of commits, finds the related tsconfig.json files, and scope the TypeScript type check to those.
# In CI, this script can be used for selective type-checking on projects that might be affected for a given PR.
# (The accuracy for finding related projects is not a 100%)

argv=( "$@" )
diffArgs=("--name-only")
uniq_dirs=()
uniq_tsconfigs=()

is_flag_set () {
  flag=$1
  if [ ${#argv[@]} -gt 0 ] && [[ ${argv[@]} =~ $flag ]]; then
    true
  else
    false
  fi
}

get_args_for_flag_result=()
get_args_for_flag () {
  flag=$1
  found=false
  get_args_for_flag_result=()
  if [ ${#argv[@]} -gt 0 ]; then
    for i in "${!argv[@]}"; do
      arg="${argv[$i]}"
      if [ "$found" == false ] && [[ "$arg" == "$flag" ]]; then
        found=true
      elif [ "$found" == true ]; then
        if [[ "$arg" == -* ]]; then
          return
        else
          get_args_for_flag_result+=("$arg")
        fi
      fi
    done
  fi
}

if is_flag_set "--help" || is_flag_set "-h"; then
  echo "Detects the files changed in a given set of commits, finds the related"
  echo "tsconfig.json files, and scope the TypeScript type check to those."
  echo
  echo "Usage:"
  echo "  $0 [options]"
  echo "  $0 [<ref1> [<ref2>]]"
  echo
  echo "Options:"
  echo "  --help, -h    Show this help"
  echo "  --cached      Check staged changes"
  echo "  --merge-base [<ref1> [<ref2>]]"
  echo "                Check changes between nearest common ansestor (merge-base) of"
  echo "                ref1 and ref2. Defaults: 'main' and 'HEAD'"
  echo
  echo "If no options are provided, the script takes between 0 and 2 arguments"
  echo "representing two git refs:"
  echo "  If 0, it will diff HEAD and HEAD^"
  echo "  If 1 (REF1), it will diff REF1 and REF1^"
  echo "  If 2 (REF1, REF2), it will diff REF1 and REF2"
  exit
fi

if [[ "${CI-}" == "true" ]]; then
  # Buildkite only
  .buildkite/scripts/bootstrap.sh

  targetBranch="${GITHUB_PR_TARGET_BRANCH-}"
  git fetch origin $targetBranch
  sha=$(git merge-base "origin/$targetBranch" "${GITHUB_PR_TRIGGERED_SHA-}")
  diffArgs+=("$sha" "${GITHUB_PR_TRIGGERED_SHA-}")
elif is_flag_set "--merge-base"; then
  # Similar to when CI=true, but locally
  get_args_for_flag "--merge-base"
  diffArgs+=("--merge-base" "${get_args_for_flag_result[0]-main}" "${get_args_for_flag_result[1]-HEAD}")
elif is_flag_set "--cached"; then
  # Only check staged files
  diffArgs+=("--cached")
else
  # Full manual mode!
  ref1="${1-HEAD}"
  diffArgs+=("$ref1" "${2-$ref1^}")
fi

echo "Detecting files changed..."
echo "DEBUG: git diff args: ${diffArgs[@]}"
files=($(git diff "${diffArgs[@]}"))

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
  echo "No tsconfig.json files found"
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
