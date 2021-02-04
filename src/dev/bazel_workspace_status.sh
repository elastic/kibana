#!/bin/bash

# Inspired on https://github.com/buildbuddy-io/buildbuddy/blob/master/workspace_status.sh
# This script will be run bazel when building process starts to
# generate key-value information that represents the status of the
# workspace. The output should be like
#
# KEY1 VALUE1
# KEY2 VALUE2
#
# If the script exits with non-zero code, it's considered as a failure
# and the output will be discarded.

# Git repo
repo_url=$(git config --get remote.origin.url)
if [[ $? != 0 ]];
then
    exit 1
fi
echo "REPO_URL ${repo_url}"

# Commit SHA
commit_sha=$(git rev-parse HEAD)
if [[ $? != 0 ]];
then
    exit 1
fi
echo "COMMIT_SHA ${commit_sha}"

# Git branch
repo_url=$(git rev-parse --abbrev-ref HEAD)
if [[ $? != 0 ]];
then
    exit 1
fi
echo "GIT_BRANCH ${repo_url}"

# Tree status
git diff-index --quiet HEAD --
if [[ $? == 0 ]];
then
    tree_status="Clean"
else
    tree_status="Modified"
fi
echo "GIT_TREE_STATUS ${tree_status}"

# Host
if [ "$CI" = "true" ]; then
  host=$(hostname | sed 's|\(.*\)-.*|\1|')
  if [[ $? != 0 ]];
  then
      exit 1
  fi
  echo "HOST ${host}"
fi
