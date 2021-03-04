#!/usr/bin/env bash

set -e

###
### verify no git modifications
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'yarn kbn bootstrap' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi

###
### rebuild kbn-pm distributable to ensure it's not out of date
###
echo " -- building kbn-pm distributable"
yarn kbn run build -i @kbn/pm

###
### verify no git modifications
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'yarn kbn run build -i @kbn/pm' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi

###
### rebuild plugin list to ensure it's not out of date
###
echo " -- building plugin list docs"
node scripts/build_plugin_list_docs

###
### verify no git modifications
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'node scripts/build_plugin_list_docs' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi
