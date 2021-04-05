#!/usr/bin/env bash

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

verify_no_git_changes() {
  RED='\033[0;31m'
  C_RESET='\033[0m' # Reset color

  GIT_CHANGES="$(git ls-files --modified)"
  if [ "$GIT_CHANGES" ]; then
    echo -e "\n${RED}ERROR: '$1' caused changes to the following files:${C_RESET}\n"
    echo -e "$GIT_CHANGES\n"
    exit 1
  fi
}
