#! /usr/bin/env bash

# Readonly vars
readonly CACHE_DIR="${HOME}/.git-references"

# Global vars
declare -a cloned_git_repos

#==============================================================================
#
# What: A library of standard Bash functions
# Why: Simplify and improve the quality of bash scripts being produced.
#
#==============================================================================

# cache_maven_deps function
# -------------------------------------
# Run a `mvnw compile` in order to populate the local
# m2 repository.
#
# Expects a single param which is a project directory to change into
# -------------------------------------
cache_maven_deps() {
  local project=$1

  # Check that 'project' dir exists
  if [[ ! -d $project ]]; then
    printf 'Project dir %s doesn''t exist. Exiting...\n' $project >&2
    exit 1
  fi

  # Switch directory, and run mvnw compile
  pushd $project
  ./mvnw compile
  popd
}

# clean_git_repo_clones function
# -------------------------------------
# Clean up any Git repo clones performed by the 'clone_git_repo' function.
# Should be called by the 'EXIT' trap.
# -------------------------------------
clean_git_repo_clones() {
  printf 'Cleaning cloned git repos...\n'

  # Loop over cloned repos and remove them...
  for cloned_repo in "${cloned_git_repos[@]}"
  do
    printf 'Removing repo %s\n' "$cloned_repo"
    rm -rf $cloned_repo
  done
}

# clone_git_repo function
# -------------------------------------
# Clone a Git repo, using either a Git SSH source, or a repo short-name.
# If a matching local reference repo is found, then that will be used as the `--reference` for the Git clone,
# otherwise a full clone is undertaken.
#
# Expects a single param which is the repo name or repo SSH source
# -------------------------------------
clone_git_repo() {
  local repo=$1
  local repo_name
  local repo_url

  # Calculate the "humanish" part of the source repo
  repo_name=$(echo "$repo" | sed -e 's|/$||' -e 's|:*/*\.git$||' -e 's|.*[/:]||g')
	local mirror_dir="${CACHE_DIR}/${repo_name}.git"

  # If $repo is a SSH repo source, use it as the repo_url.
  # Otherwise, attempt to get the origin URL from the matching reference repo, failing if the reference repo is not present.
  if [[ $repo == git* ]]; then
    repo_url=$repo
  else
    if [[ -d $mirror_dir ]]; then
      repo_url=$(cd "$mirror_dir" && git remote get-url origin)
    else
      printf 'Attempting to clone %s using the short-name, however no matching reference repo found. Exiting...\n' "$repo" >&2
      exit 1
    fi
  fi

  # Check if we have a reference repo clone for this repo,
  # and use it for the clone if we do.
  # Otherwise clone the repo directly.
  if [[ -d $mirror_dir ]]; then
    printf 'Cloning repo %s using reference repo...\n' "$repo"
    git clone -q --reference "$mirror_dir" "$repo_url" || exit 1
  else
    printf 'Cloning repo %s directly...' "$repo"
    git clone -q "$repo_url" || exit 1
  fi

  # Add repo to cloned repo array
  cloned_git_repos+=("$repo")

  # Clean up clone on exit
  trap clean_git_repo_clones EXIT
}

# retry function
# -------------------------------------
# Retry a command for a specified number of times until the command exits successfully.
# Retry wait period backs off exponentially after each retry.
#
# The first argument should be the number of retries.
# Remainder is treated as the command to execute.
# -------------------------------------
retry() {
  local retries=$1
  shift

  local count=0
  until "$@"; do
    exit=$?
    wait=$((2 ** $count))
    count=$(($count + 1))
    if [ $count -lt $retries ]; then
      printf "Retry %s/%s exited %s, retrying in %s seconds...\n" "$count" "$retries" "$exit" "$wait" >&2
      sleep $wait
    else
      printf "Retry %s/%s exited %s, no more retries left.\n" "$count" "$retries" "$exit" >&2
      return $exit
    fi
  done
  return 0
}
