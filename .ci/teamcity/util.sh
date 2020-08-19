#!/usr/bin/env bash

# Sets up an environment variable locally, and also makes it available for subsequent steps in the build
# NOTE: env vars set up this way will be visible in the UI when logged in. Use tc_set_env_secret for items that need to be hidden
tc_set_env() {
  export "$1"="$2"
  echo "##teamcity[setParameter name='env.$1' value='$2']"
}

# Sets up an environment variable locally, and also makes it available for subsequent steps in the build
# Also hides the value from the UI
tc_set_env_secret() {
  export "$1"="$2"
  echo "##teamcity[setParameter name='env.$1' value='$2' display='hidden' password='true']"
}

verify_no_git_changes() {
  RED='\033[0;31m'
  C_RESET='\033[0m' # Reset color

  "$@"

  GIT_CHANGES="$(git ls-files --modified)"
  if [ "$GIT_CHANGES" ]; then
    echo -e "\n${RED}ERROR: '$*' caused changes to the following files:${C_RESET}\n"
    echo -e "$GIT_CHANGES\n"
    exit 1
  fi
}

tc_start_block() {
  echo "##teamcity[blockOpened name='$1']"
}

tc_end_block() {
  echo "##teamcity[blockClosed name='$1']"
}

checks-reporter-with-killswitch() {
  if [ "$CHECKS_REPORTER_ACTIVE" == "true" ] ; then
    yarn run github-checks-reporter "$@"
  else
    arguments=("$@");
    "${arguments[@]:1}";
  fi
}
