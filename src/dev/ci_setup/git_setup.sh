#!/bin/bash

# Turn on semi-strict mode
set -e
set -o pipefail

SCRIPT=${BASH_SOURCE[0]}
# SCRIPT may be an arbitrarily deep series of symlinks. Loop until we have the concrete path.
while [ -h "$SCRIPT" ] ; do
  ls=$(ls -ld "$SCRIPT")
  # Drop everything prior to ->
  link=$(expr "$ls" : '.*-> \(.*\)$')
  if expr "$link" : '/.*' > /dev/null; then
    SCRIPT="$link"
  else
    SCRIPT=$(dirname "$SCRIPT")/"$link"
  fi
  echo $SCRIPT
done

# kibana directory is the parent of x-pack
export KIBANA_DIR="$(cd "$(dirname "$SCRIPT")/../../.."; pwd)"

# PARENT_DIR is the directory where we will checkout es and x-pack-es
export PARENT_DIR="$(cd "$KIBANA_DIR"/..; pwd)"

function checkout_sibling {
  project=$1
  targetDir=$2
  useExistingParamName=$3
  useExisting="$(eval "echo "\$$useExistingParamName"")"

  if [ -z ${useExisting:+x} ]; then
    if [ -d "$targetDir" ]; then
      echo "I expected a clean workspace but an '${project}' sibling directory already exists in [$PARENT_DIR]!"
      echo
      echo "Either define '${useExistingParamName}' or remove the existing '${project}' sibling."
      exit 1
    fi

    # read by clone_target_is_valid, and checkout_clone_target populated by pick_clone_target
    cloneAuthor=""
    cloneBranch=""

    function clone_target_is_valid {
      echo " -> checking for '${cloneBranch}' branch at ${cloneAuthor}/${project}"
      if [[ -n "$(git ls-remote --heads git@github.com:${cloneAuthor}/${project}.git ${cloneBranch} 2>/dev/null)" ]]; then
        return 0
      else
        return 1
      fi
    }

    function pick_clone_target {
      echo "picking which branch of ${project} to clone:"
      if [[ -n "$PR_AUTHOR" && -n "$PR_SOURCE_BRANCH" ]]; then
        cloneAuthor="$PR_AUTHOR"
        cloneBranch="$PR_SOURCE_BRANCH"
        if clone_target_is_valid ; then
          return 0
        fi
      fi

      cloneAuthor="elastic"
      cloneBranch="${PR_SOURCE_BRANCH:-${GIT_BRANCH#*/}}" # GIT_BRANCH starts with the repo, i.e., origin/master
      if clone_target_is_valid ; then
        return 0
      fi

      cloneBranch="${PR_TARGET_BRANCH:-master}"
      if clone_target_is_valid ; then
        return 0
      fi

      cloneBranch="master"
      if clone_target_is_valid; then
        return 0
      fi

      echo "failed to find a valid branch to clone"
      return 1
    }

    function checkout_clone_target {
      pick_clone_target
      if [[ $cloneBranch = "master"  && $cloneAuthor = "elastic" ]]; then
        export TEST_ES_FROM=snapshot
      fi

      echo " -> checking out '${cloneBranch}' branch from ${cloneAuthor}/${project}..."
      git clone -b "$cloneBranch" "git@github.com:${cloneAuthor}/${project}.git" "$targetDir" --depth=1
      echo " -> checked out ${project} revision: $(git -C ${targetDir} rev-parse HEAD)"
      echo
    }

    checkout_clone_target
  else
    if [ -d "$targetDir" ]; then
      echo "Using existing '${project}' checkout"
    else
      echo "You have defined '${useExistingParamName}' but no existing ${targetDir} directory exists!"
      exit 2
    fi
  fi
}

checkout_sibling "elasticsearch" "${PARENT_DIR}/elasticsearch" "USE_EXISTING_ES"
