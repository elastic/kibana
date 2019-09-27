#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh true

echo " -- KIBANA_DIR='$KIBANA_DIR'"
echo " -- XPACK_DIR='$XPACK_DIR'"
echo " -- PARENT_DIR='$PARENT_DIR'"
echo " -- KIBANA_PKG_BRANCH='$KIBANA_PKG_BRANCH'"
echo " -- TEST_ES_SNAPSHOT_VERSION='$TEST_ES_SNAPSHOT_VERSION'"

###
### check that we seem to be in a kibana project
### Disable git automatic lineend handling
###
git config --global core.autocrlf true;

function verifyRunWithoutChanges {
  cmd="$*"
  "$@"

  changes="$(git ls-files --modified)"
  diff="$(git diff)"
  RED='\033[0;31m'
  C_RESET='\033[0m' # Reset color

  if [ "$changes" != "" ] && [ "$diff" != "" ]; then
    echo ""
    echo -e "${RED}ERROR: '$cmd' caused changes to the following files:${C_RESET}\n"
    echo ""
    echo "$changes"
    echo ""
    echo "Diff output:"
    git diff
    echo ""
    echo ""
    exit 1
  fi

  if [ "$changes" != "" ] && [ "$diff" == "" ]; then
    echo ""
    echo -e "${RED}WARNING: hard reseting repo to discard un-diffable changes:${C_RESET}\n"
    echo ""
    echo "$changes"
    echo ""
    git reset --hard;
  fi
}


###
### install dependencies
###
echo " -- installing node.js dependencies"
verifyRunWithoutChanges yarn kbn bootstrap --prefer-offline

# skip kbn-pm build check on windows, installed packages are slightly different so module ids are slightly different
if [ "$OS" != "win" ]; then
  ###
  ### rebuild kbn-pm distributable to ensure it's not out of date
  ###
  echo " -- building kbn-pm distributable"
  verifyRunWithoutChanges yarn kbn run build -i @kbn/pm
fi

###
### rebuild kbn-pm distributable to ensure it's not out of date
###
echo " -- building renovate config"
verifyRunWithoutChanges node scripts/build_renovate_config
