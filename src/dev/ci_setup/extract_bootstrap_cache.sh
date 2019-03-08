#!/usr/bin/env bash

set -e

targetBranch="${PR_TARGET_BRANCH:-${GIT_BRANCH#*/}}"
bootstrapCache="$HOME/.kibana/bootstrap_cache/$targetBranch.tar"

###
### Extract the bootstrap cache that we create in the packer_cache.sh script
###
if [ -f "$bootstrapCache" ]; then
  echo "extracting bootstrap_cache from $bootstrapCache";
  tar -xf "$bootstrapCache";
else
  echo ""
  echo ""
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";
  echo "            bootstrap_cache missing";
  echo "            looked for '$bootstrapCache'";
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~";
  echo ""
  echo ""
fi
