#!/bin/bash

set -e

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
      if [[ -n "$(git ls-remote --heads "git@github.com:${cloneAuthor}/${project}.git" ${cloneBranch} 2>/dev/null)" ]]; then
        return 0
      else
        return 1
      fi
    }

    function pick_clone_target {
      echo "To develop Kibana features against a specific branch of ${project} and being able to"
      echo "test that feature also on CI, the CI is trying to find branches on ${project} with the same name as"
      echo "the Kibana branch (first on your fork and then upstream) before building from master."
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

      cloneBranch="${PR_TARGET_BRANCH:-$KIBANA_PKG_BRANCH}"
      if clone_target_is_valid ; then
        return 0
      fi

      cloneBranch="$KIBANA_PKG_BRANCH"
      if clone_target_is_valid; then
        return 0
      fi

      echo "failed to find a valid branch to clone"
      return 1
    }

    function checkout_clone_target {
      pick_clone_target

      if [[ "$cloneAuthor/$cloneBranch" != "elastic/$KIBANA_PKG_BRANCH" ]]; then
        echo " -> Setting TEST_ES_FROM=source so that ES in tests will be built from $cloneAuthor/$cloneBranch"
        export TEST_ES_FROM=source
      fi

      echo " -> checking out '${cloneBranch}' branch from ${cloneAuthor}/${project}..."
      git clone -b "$cloneBranch" "git@github.com:${cloneAuthor}/${project}.git" "$targetDir" --depth=1
      echo " -> checked out ${project} revision: $(git -C "${targetDir}" rev-parse HEAD)"
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
export TEST_ES_FROM=${TEST_ES_FROM:-snapshot}

# Set the JAVA_HOME based on the Java property file in the ES repo
# This assumes the naming convention used on CI (ex: ~/.java/java10)
ES_DIR="$PARENT_DIR/elasticsearch"
ES_JAVA_PROP_PATH=$ES_DIR/.ci/java-versions.properties


if [ ! -f "$ES_JAVA_PROP_PATH" ]; then
  echo "Unable to set JAVA_HOME, $ES_JAVA_PROP_PATH does not exist"
  exit 1
fi

# While sourcing the property file would currently work, we want
# to support the case where whitespace surrounds the equals.
# This has the added benefit of explicitly exporting property values
ES_BUILD_JAVA="$(grep "^ES_BUILD_JAVA" "$ES_JAVA_PROP_PATH" | cut -d'=' -f2 | tr -d '[:space:]')"
export ES_BUILD_JAVA

if [ -z "$ES_BUILD_JAVA" ]; then
  echo "Unable to set JAVA_HOME, ES_BUILD_JAVA not present in $ES_JAVA_PROP_PATH"
  exit 1
fi

echo "Setting JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA"
export JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA
