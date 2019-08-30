#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"

UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
fi
echo " -- OS=$OS"

###
### Since the Jenkins logging output collector doesn't look like a TTY
### Node/Chalk and other color libs disable their color output. But Jenkins
### can handle color fine, so this forces https://github.com/chalk/supports-color
### to enable color support in Chalk and other related modules.
###
export FORCE_COLOR=1

export KIBANA_DIR="$dir"
echo " -- KIBANA_DIR='$KIBANA_DIR'"

export XPACK_DIR="$KIBANA_DIR/x-pack"
echo " -- XPACK_DIR='$XPACK_DIR'"

parentDir="$(cd "$KIBANA_DIR/.."; pwd)"
export PARENT_DIR="$parentDir"
echo " -- PARENT_DIR='$PARENT_DIR'"

# uncomment to pin to a snapshot from: https://artifacts-api.elastic.co/v1/branches/{branch}/builds
# export TEST_ES_SNAPSHOT_VERSION=8.0.0-5480a616
echo " -- TEST_ES_SNAPSHOT_VERSION='$TEST_ES_SNAPSHOT_VERSION'"

###
### download node
###

nodeVersion="$(cat "$dir/.node-version")"
nodeDir="$cacheDir/node/$nodeVersion"

if [[ "$OS" == "win" ]]; then
  nodeBin="$HOME/node"
  nodeUrl="https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
else
  nodeBin="$nodeDir/bin"
  nodeUrl="https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-linux-x64.tar.gz"
fi

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

###
### "install" node into this shell
###
export PATH="$nodeBin:$PATH"

###
### read kibana package branch
###
kbnBranch="$(node -e "console.log(require('./package.json').branch)")"
export KIBANA_PKG_BRANCH="$kbnBranch"
echo " -- KIBANA_PKG_BRANCH='$KIBANA_PKG_BRANCH'"

###
### downloading yarn
###
yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
npm install -g "yarn@^${yarnVersion}"

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

function verifyRunWithoutChanges {
  cmd="$*"
  "$@"

  changes="$(git ls-files --modified)"
  diff="$(git diff)"

  if [ "$changes" != "" ] && [ "$diff" != "" ]; then
    RED='\033[0;31m'
    C_RESET='\033[0m' # Reset color

    echo ""
    echo -e "${RED}ERROR: '$cmd' caused changes to the following files:${C_RESET}\n"
    echo ""
    echo "$changes"
    echo ""
    echo "Diff output:"
    git diff
    echo ""
    echo ""
    exit 1
  fi

  if [ "$changes" != "" ] && [ "$diff" == "" ]; then
    echo ""
    echo -e "${RED}WARNING: hard reseting repo to discard un-diffable changes:\n"
    echo ""
    echo "$changes"
    echo ""
    git reset --hard;
  fi
}

###
### install dependencies
###
echo " -- installing node.js dependencies"
verifyRunWithoutChanges yarn kbn bootstrap --prefer-offline

# skip kbn-pm build check on windows, installed packages are slightly different so module ids are slightly different
if [ "$OS" != "win" ]; then
  ###
  ### rebuild kbn-pm distributable to ensure it's not out of date
  ###
  echo " -- building kbn-pm distributable"
  verifyRunWithoutChanges yarn kbn run build -i @kbn/pm
fi

###
### rebuild kbn-pm distributable to ensure it's not out of date
###
echo " -- building renovate config"
verifyRunWithoutChanges node scripts/build_renovate_config

###
### github-checks-reporter kill switch. Remove to disable
###
export CHECKS_REPORTER_ACTIVE=true

### only run on pr jobs
if [[ "$JOB_NAME" != "elastic+kibana+pull-request"* ]] ; then
  export CHECKS_REPORTER_ACTIVE=false
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
