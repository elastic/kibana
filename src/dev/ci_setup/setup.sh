#!/usr/bin/env bash

set -e

source src/dev/ci_setup/setup_env.sh true

echo " -- KIBANA_DIR='$KIBANA_DIR'"
echo " -- XPACK_DIR='$XPACK_DIR'"
echo " -- PARENT_DIR='$PARENT_DIR'"
echo " -- KIBANA_PKG_BRANCH='$KIBANA_PKG_BRANCH'"
echo " -- TEST_ES_SNAPSHOT_VERSION='$TEST_ES_SNAPSHOT_VERSION'"

###
### install dependencies
###
echo " -- installing node.js dependencies"
yarn kbn bootstrap --verbose

###
### Download es snapshots
###
echo " -- downloading es snapshot"
node scripts/es snapshot --download-only;

###
### verify no git modifications caused by bootstrap
###
if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  GIT_CHANGES="$(git ls-files --modified)"
  if [ "$GIT_CHANGES" ]; then
    echo -e "\n${RED}ERROR: 'yarn kbn bootstrap' caused changes to the following files:${C_RESET}\n"
    echo -e "$GIT_CHANGES\n"
    exit 1
  fi
fi
