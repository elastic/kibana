#!/usr/bin/env bash

tc_escape() {
  escaped="$1"

  # See https://www.jetbrains.com/help/teamcity/service-messages.html#Escaped+values

  escaped="$(echo "$escaped" | sed -z 's/|/||/g')"
  escaped="$(echo "$escaped" | sed -z "s/'/|'/g")"
  escaped="$(echo "$escaped" | sed -z 's/\[/|\[/g')"
  escaped="$(echo "$escaped" | sed -z 's/\]/|\]/g')"
  escaped="$(echo "$escaped" | sed -z 's/\n/|n/g')"
  escaped="$(echo "$escaped" | sed -z 's/\r/|r/g')"

  echo "$escaped"
}

# Sets up an environment variable locally, and also makes it available for subsequent steps in the build
# NOTE: env vars set up this way will be visible in the UI when logged in unless you set them up as blank password parameters ahead of time.
tc_set_env() {
  export "$1"="$2"
  echo "##teamcity[setParameter name='env.$1' value='$(tc_escape "$2")']"
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

is_pr() {
  [[ "${GITHUB_PR_NUMBER-}" ]] && return
  false
}

# This function is specifcally for retrying test runner steps one time
# A different solution should be used for retrying general steps (e.g. bootstrap)
tc_retry() {
  tc_start_block "Retryable Step - Attempt #1"
  "$@" || {
    tc_end_block "Retryable Step - Attempt #1"
    tc_start_block "Retryable Step - Attempt #2"
    >&2 echo "First attempt failed. Retrying $*"
    if "$@"; then
      echo 'Second attempt successful'
      echo "##teamcity[buildStatus status='SUCCESS' text='{build.status.text} with a flaky failure']"
      echo "##teamcity[setParameter name='elastic.build.flaky' value='true']"
      tc_end_block "Retryable Step - Attempt #2"
    else
      status="$?"
      tc_end_block "Retryable Step - Attempt #2"
      return "$status"
    fi
  }
  tc_end_block "Retryable Step - Attempt #1"
}
