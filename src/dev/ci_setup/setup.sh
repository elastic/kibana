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
### upload ts-refs-cache artifacts as quickly as possible so they are available for download
###
if [[ "$BUILD_TS_REFS_CACHE_CAPTURE" == "true" ]]; then
  cd "$KIBANA_DIR/target/ts_refs_cache"
  gsutil cp "*.zip" 'gs://kibana-ci-ts-refs-cache/'
  cd "$KIBANA_DIR"
fi

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

###
### Generate event log mappings
###
echo " -- generating event log mappings"
node x-pack/plugins/event_log/scripts/create_schemas.js

###
### verify no git modifications caused by event log mapping generation
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'event_log/scripts/create_schemas.js' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  echo -e "Ensure you are not directly making changes to the files in x-pack/plugins/event_log/generated/."
  echo -e "Follow the directions in x-pack/plugins/event_log/generated/README.md to make schema changes for the event log."
  exit 1
fi
