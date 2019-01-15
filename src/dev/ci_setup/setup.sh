#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"

RED='\033[0;31m'
C_RESET='\033[0m' # Reset color

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
export PARENT_DIR="$(cd "$KIBANA_DIR/.."; pwd)"
export TEST_ES_SNAPSHOT_VERSION="7.0.0-fbd1a09d"
echo "-> KIBANA_DIR $KIBANA_DIR"
echo "-> XPACK_DIR $XPACK_DIR"
echo "-> PARENT_DIR $PARENT_DIR"
echo "-> TEST_ES_SNAPSHOT_VERSION $TEST_ES_SNAPSHOT_VERSION"

###
### download node
###
UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
fi
echo " -- Running on OS: $OS"

nodeVersion="$(cat $dir/.node-version)"
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
if [ -x "$nodeBin/node" ] && [ "$($nodeBin/node --version)" == "v$nodeVersion" ]; then
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
    curl --silent -o $nodePkg $nodeUrl
    unzip -qo $nodePkg -d $nodeDir
    mv "${nodePkg%.*}" "$nodeBin"
  else
    curl --silent "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
  fi

fi

###
### "install" node into this shell
###
export PATH="$nodeBin:$PATH"
hash -r

###
### downloading yarn
###
yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
npm install -g yarn@^${yarnVersion}

###
### setup yarn offline cache
###
yarn config set yarn-offline-mirror "$cacheDir/yarn-offline-cache"

###
### "install" yarn into this shell
###
yarnGlobalDir="$(yarn global bin)"
export PATH="$PATH:$yarnGlobalDir"
hash -r

###
### install dependencies
###
echo " -- installing node.js dependencies"
yarn kbn bootstrap --prefer-offline

###
### verify no git modifications
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'yarn kbn bootstrap' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi
