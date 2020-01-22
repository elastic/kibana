#!/usr/bin/env bash

set -e

if [[ "$CI_ENV_SETUP" ]]; then
  return 0
fi

installNode=$1

dir="$(pwd)"
cacheDir="$HOME/.kibana"

RED='\033[0;31m'
C_RESET='\033[0m' # Reset color

export NODE_OPTIONS="$NODE_OPTIONS --throw-deprecation --max-old-space-size=4096"

###
### Since the Jenkins logging output collector doesn't look like a TTY
### Node/Chalk and other color libs disable their color output. But Jenkins
### can handle color fine, so this forces https://github.com/chalk/supports-color
### to enable color support in Chalk and other related modules.
###
export FORCE_COLOR=1

###
### The @babel/register cache collects the build output from each file in
### a map, in memory, and then when the process exits it writes that to the
### babel cache file as a JSON encoded object. Stringifying that object
### causes OOMs on CI regularly enough that we need to find another solution,
### and until we do we need to disable the cache
###
export BABEL_DISABLE_CACHE=true

###
### check that we seem to be in a kibana project
###
if [ -f "$dir/package.json" ] && [ -f "$dir/.node-version" ]; then
  echo "Setting up node.js and yarn in $dir"
else
  echo "${RED}src/dev/ci_setup/setup.sh must be run within a kibana repo${C_RESET}"
  exit 1
fi


export KIBANA_DIR="$dir"
export XPACK_DIR="$KIBANA_DIR/x-pack"

parentDir="$(cd "$KIBANA_DIR/.."; pwd)"
export PARENT_DIR="$parentDir"

kbnBranch="$(jq -r .branch "$KIBANA_DIR/package.json")"
export KIBANA_PKG_BRANCH="$kbnBranch"

###
### download node
###
UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
fi
echo " -- Running on OS: $OS"

nodeVersion="$(cat "$dir/.node-version")"
nodeDir="$cacheDir/node/$nodeVersion"

if [[ "$OS" == "win" ]]; then
  nodeBin="$HOME/node"
  nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
else
  nodeBin="$nodeDir/bin"
  nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$nodeVersion/node-v$nodeVersion-linux-x64.tar.gz"
fi

if [[ "$installNode" == "true" ]]; then
  echo " -- node: version=v${nodeVersion} dir=$nodeDir"

  echo " -- setting up node.js"
  if [ -x "$nodeBin/node" ] && [ "$("$nodeBin/node" --version)" == "v$nodeVersion" ]; then
    echo " -- reusing node.js install"
  else
    if [ -d "$nodeDir" ]; then
      echo " -- clearing previous node.js install"
      rm -rf "$nodeDir"
    fi

    echo " -- downloading node.js from $nodeUrl"
    mkdir -p "$nodeDir"
    if [[ "$OS" == "win" ]]; then
      nodePkg="$nodeDir/${nodeUrl##*/}"
      curl --silent -L -o "$nodePkg" "$nodeUrl"
      unzip -qo "$nodePkg" -d "$nodeDir"
      mv "${nodePkg%.*}" "$nodeBin"
    else
      curl --silent -L "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
    fi
  fi
fi

###
### "install" node into this shell
###
export PATH="$nodeBin:$PATH"

if [[ "$installNode" == "true" || ! $(which yarn) ]]; then
  ###
  ### downloading yarn
  ###
  yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
  npm install -g "yarn@^${yarnVersion}"
fi

###
### setup yarn offline cache
###
yarn config set yarn-offline-mirror "$cacheDir/yarn-offline-cache"

###
### "install" yarn into this shell
###
yarnGlobalDir="$(yarn global bin)"
export PATH="$PATH:$yarnGlobalDir"

# use a proxy to fetch chromedriver/geckodriver asset
export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"


export CHECKS_REPORTER_ACTIVE=false

### only run on pr jobs for elastic/kibana, checks-reporter doesn't work for other repos
if [[ "$ghprbPullId" && "$ghprbGhRepository" == 'elastic/kibana' ]] ; then
  export CHECKS_REPORTER_ACTIVE=true
fi

###
### Implements github-checks-reporter kill switch when scripts are called from the command line
### $@ - all arguments
###
function checks-reporter-with-killswitch() {
  if [ "$CHECKS_REPORTER_ACTIVE" == "true" ] ; then
    yarn run github-checks-reporter "$@"
  else
    arguments=("$@");
    "${arguments[@]:1}";
  fi
}

export -f checks-reporter-with-killswitch

source "$KIBANA_DIR/src/dev/ci_setup/load_env_keys.sh"

ES_DIR="$PARENT_DIR/elasticsearch"
ES_JAVA_PROP_PATH=$ES_DIR/.ci/java-versions.properties

if [[ -d "$ES_DIR" && -f "$ES_JAVA_PROP_PATH" ]]; then
  ES_BUILD_JAVA="$(grep "^ES_BUILD_JAVA" "$ES_JAVA_PROP_PATH" | cut -d'=' -f2 | tr -d '[:space:]')"
  export ES_BUILD_JAVA

  if [ -z "$ES_BUILD_JAVA" ]; then
    echo "Unable to set JAVA_HOME, ES_BUILD_JAVA not present in $ES_JAVA_PROP_PATH"
    exit 1
  fi

  echo "Setting JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA"
  export JAVA_HOME=$HOME/.java/$ES_BUILD_JAVA
fi

export CI_ENV_SETUP=true
