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

check_for_changed_files() {
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  C_RESET='\033[0m' # Reset color

  SHOULD_AUTO_COMMIT_CHANGES="${2:-}"
  GIT_CHANGES="$(git ls-files --modified -- . ':!:.bazelrc')"

  if [ "$GIT_CHANGES" ]; then
    if [[ "$SHOULD_AUTO_COMMIT_CHANGES" == "true" && "${BUILDKITE_PULL_REQUEST:-}" ]]; then
      NEW_COMMIT_MESSAGE="[CI] Auto-commit changed files from '$1'"
      PREVIOUS_COMMIT_MESSAGE="$(git log -1 --pretty=%B)"

      if [[ "$NEW_COMMIT_MESSAGE" == "$PREVIOUS_COMMIT_MESSAGE" ]]; then
        echo -e "\n${RED}ERROR: '$1' caused changes to the following files:${C_RESET}\n"
        echo -e "$GIT_CHANGES\n"
        echo -e "CI already attempted to commit these changes, but the file(s) seem to have changed again."
        echo -e "Please review and fix manually."
        exit 1
      fi

      echo "'$1' caused changes to the following files:"
      echo "$GIT_CHANGES"
      echo ""
      echo "Auto-committing these changes now. A new build should start soon if successful."

      git config --global user.name kibanamachine
      git config --global user.email '42973632+kibanamachine@users.noreply.github.com'
      gh pr checkout "${BUILDKITE_PULL_REQUEST}"
      git add -u -- . ':!.bazelrc'

      git commit -m "$NEW_COMMIT_MESSAGE"
      git push

      # After the git push, the new commit will trigger a new build within a few seconds and this build should get cancelled
      # So, let's just sleep to give the build time to cancel itself without an error
      # If it doesn't get cancelled for some reason, then exit with an error, because we don't want this build to be green (we just don't want it to generate an error either)
      sleep 300
      exit 1
    else
      echo -e "\n${RED}ERROR: '$1' caused changes to the following files:${C_RESET}\n"
      echo -e "$GIT_CHANGES\n"
      echo -e "\n${YELLOW}TO FIX: Run '$1' locally, commit the changes and push to your branch${C_RESET}\n"
      exit 1
    fi
  fi
}

# docker_run can be used in place of `docker run`
# it automatically passes along all of Buildkite's tracked environment variables, and mounts the buildkite-agent in the running container
docker_run() {
  args=()

  if [[ -n "${BUILDKITE_ENV_FILE:-}" ]] ; then
    # Read in the env file and convert to --env params for docker
    # This is because --env-file doesn't support newlines or quotes per https://docs.docker.com/compose/env-file/#syntax-rules
    while read -r var; do
      args+=( --env "${var%%=*}" )
    done < "$BUILDKITE_ENV_FILE"
  fi

  BUILDKITE_AGENT_BINARY_PATH=$(command -v buildkite-agent)
  args+=(
    "--env" "BUILDKITE_JOB_ID"
    "--env" "BUILDKITE_BUILD_ID"
    "--env" "BUILDKITE_AGENT_ACCESS_TOKEN"
    "--volume" "$BUILDKITE_AGENT_BINARY_PATH:/usr/bin/buildkite-agent"
  )

  docker run "${args[@]}" "$@"
}

is_test_execution_step() {
  buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_is_test_execution_step" 'true'
}

retry() {
  local retries=$1; shift
  local delay=$1; shift
  local attempts=1

  until "$@"; do
    retry_exit_status=$?
    echo "Exited with $retry_exit_status" >&2
    if (( retries == "0" )); then
      return $retry_exit_status
    elif (( attempts == retries )); then
      echo "Failed $attempts retries" >&2
      return $retry_exit_status
    else
      echo "Retrying $((retries - attempts)) more times..." >&2
      attempts=$((attempts + 1))
      sleep "$delay"
    fi
  done
}

set_git_merge_base() {
  GITHUB_PR_MERGE_BASE="$(buildkite-agent meta-data get merge-base --default '')"

  if [[ ! "$GITHUB_PR_MERGE_BASE" ]]; then
    git fetch origin "$GITHUB_PR_TARGET_BRANCH"
    GITHUB_PR_MERGE_BASE="$(git merge-base HEAD FETCH_HEAD)"
    buildkite-agent meta-data set merge-base "$GITHUB_PR_MERGE_BASE"
  fi

  export GITHUB_PR_MERGE_BASE
}
