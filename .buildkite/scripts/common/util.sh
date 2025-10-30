#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/vault_fns.sh"

is_pr() {
  [[ "${GITHUB_PR_NUMBER-}" ]] && return
  false
}

is_pr_with_label() {
  match="$1"

  IFS=',' read -ra labels <<< "${GITHUB_PR_LABELS:-}"

  for label in "${labels[@]:-}"
  do
    if [ "$label" == "$match" ]; then
      return
    fi
  done

  false
}

is_auto_commit_disabled() {
  is_pr_with_label "ci:no-auto-commit"
}

check_for_changed_files() {
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  C_RESET='\033[0m' # Reset color

  SHOULD_AUTO_COMMIT_CHANGES="${2:-}"
  CUSTOM_FIX_MESSAGE="${3:-Changes from $1}"
  GIT_CHANGES="$(git status --porcelain -- . ':!:config/node.options' ':!config/kibana.yml')"

  if [ "$GIT_CHANGES" ]; then
    if ! is_auto_commit_disabled && [[ "$SHOULD_AUTO_COMMIT_CHANGES" == "true" && "${BUILDKITE_PULL_REQUEST:-false}" != "false" ]]; then
      echo "'$1' caused changes to the following files:"
      echo "$GIT_CHANGES"
      echo ""
      echo "Auto-committing & pushing these changes now."

      git config --global user.name kibanamachine
      git config --global user.email '42973632+kibanamachine@users.noreply.github.com'
      gh pr checkout "${BUILDKITE_PULL_REQUEST}"
      git add -A -- . ':!config/node.options' ':!config/kibana.yml'

      git commit -m "$CUSTOM_FIX_MESSAGE"
      git push

      # Wait to ensure all commits arrive before we terminate the build
      sleep 300
      # Still exit with error to fail the current build, a new build should be started after the push
      exit 1
    else
      echo -e "\n${RED}ERROR: '$1' caused changes to the following files:${C_RESET}\n"
      echo -e "$GIT_CHANGES\n"
      if [ "$CUSTOM_FIX_MESSAGE" ]; then
        echo "$CUSTOM_FIX_MESSAGE"
      else
        echo -e "\n${YELLOW}TO FIX: Run '$1' locally, commit the changes and push to your branch${C_RESET}\n"
      fi
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

# If npm install is terminated early, e.g. because the build was cancelled in buildkite,
# a package directory is left behind in a bad state that can cause all subsequent installs to fail
# So this function contains some cleanup/retry logic to try to recover from this kind of situation
npm_install_global() {
  package="$1"
  version="${2:-latest}"
  toInstall="$package@$version"

  npmRoot=$(npm root -g)
  packageRoot="${npmRoot:?}/$package"

  # The success flag file exists just to try to make sure we know that the full install was done
  # For example, if a job terminates in the middle of npm install, a directory could be left behind that we don't know the state of
  successFlag="${packageRoot:?}/.install-success"

  if [[ -d "$packageRoot" && ! -f "$successFlag" ]]; then
    echo "Removing existing package directory $packageRoot before install, seems previous installation was not successful"
    rm -rf "$packageRoot"
  fi

  if [[ ! $(npm install -g "$toInstall" && touch "$successFlag") ]]; then
    rm -rf "$packageRoot"
    echo "Trying again to install $toInstall..."
    npm install -g "$toInstall" && touch "$successFlag"
  fi
}

# Download an artifact using the buildkite-agent, takes the same arguments as https://buildkite.com/docs/agent/v3/cli-artifact#downloading-artifacts-usage
# times-out after 60 seconds and retries up to 3 times
download_artifact() {
  retry 3 1 timeout 3m buildkite-agent artifact download "$@"
}

print_if_dry_run() {
  if [[ "${DRY_RUN:-}" =~ ^(1|true)$ ]]; then
    echo "DRY_RUN is enabled."
  fi
}

docker_with_retry () {
  cmd=$1
  shift
  args=("$@")
  attempt=0
  max_retries=5
  sleep_time=15

  while true
  do
    attempt=$((attempt+1))

    if [ $attempt -gt $max_retries ]
    then
      echo "Docker $cmd retries exceeded, aborting."
      exit 1
    fi

    if docker "$cmd" "${args[@]}"
    then
      echo "Docker $cmd successful."
      break
    else
      echo "Docker $cmd unsuccessful, attempt '$attempt'... Retrying in $sleep_time"
      sleep $sleep_time
    fi
  done
}
