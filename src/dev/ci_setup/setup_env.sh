#!/usr/bin/env bash

set -e

installNode=$1

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"

RED='\033[0;31m'
C_RESET='\033[0m' # Reset color

###
### keep until 7.3.3 snapshots are available
###
export TEST_ES_BRANCH=7.3.2

###
### Since the Jenkins logging output collector doesn't look like a TTY
### Node/Chalk and other color libs disable their color output. But Jenkins
### can handle color fine, so this forces https://github.com/chalk/supports-color
### to enable color support in Chalk and other related modules.
###
export FORCE_COLOR=1

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
  nodeUrl="https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
else
  nodeBin="$nodeDir/bin"
  nodeUrl="https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-linux-x64.tar.gz"
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
      curl --silent -o "$nodePkg" "$nodeUrl"
      unzip -qo "$nodePkg" -d "$nodeDir"
      mv "${nodePkg%.*}" "$nodeBin"
    else
      curl --silent "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
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
