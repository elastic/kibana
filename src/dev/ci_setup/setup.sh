#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"

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
  echo "src/dev/ci_setup/setup.sh must be run within a kibana repo"
  exit 1
fi


###
### download node
###
nodeVersion="$(cat $dir/.node-version)"
nodeUrl="https://nodejs.org/download/release/v$nodeVersion/node-v$nodeVersion-linux-x64.tar.gz"
nodeDir="$cacheDir/node/$nodeVersion"
echo " -- node: version=v${nodeVersion} dir=$nodeDir"

echo " -- setting up node.js"
if [ -x "$nodeDir/bin/node" ] && [ "$($nodeDir/bin/node --version)" == "v$nodeVersion" ]; then
  echo " -- reusing node.js install"
else
  if [ -d "$nodeDir" ]; then
    echo " -- clearing previous node.js install"
    rm -rf "$nodeDir"
  fi

  echo " -- downloading node.js from $nodeUrl"
  mkdir -p "$nodeDir"
  curl --silent "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
fi


###
### "install" node into this shell
###
export PATH="$nodeDir/bin:$PATH"
hash -r


###
### downloading yarn
###
yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
yarnUrl="https://github.com/yarnpkg/yarn/releases/download/v$yarnVersion/yarn-$yarnVersion.js"
yarnDir="$cacheDir/yarn/$yarnVersion"
if [ -z "$yarnVersion" ]; then
  echo " !! missing engines.yarn in package.json";
  exit 1
elif [ -x "$yarnDir/bin/yarn" ] && [ "$($yarnDir/bin/yarn --version)" == "$yarnVersion" ]; then
  echo " -- reusing yarn install"
else
  if [ -d "$yarnDir" ]; then
    echo " -- clearing previous yarn install"
    rm -rf "$yarnDir"
  fi

  echo " -- downloading yarn from $yarnUrl"
  mkdir -p "$yarnDir/bin"
  curl -L --silent "$yarnUrl" > "$yarnDir/bin/yarn"
  chmod +x "$yarnDir/bin/yarn"
fi


###
### "install" yarn into this shell
###
export PATH="$yarnDir/bin:$PATH"
yarnGlobalDir="$(yarn global bin)"
export PATH="$PATH:$yarnGlobalDir"
hash -r


###
### install dependencies
###
echo " -- installing node.js dependencies"
yarn config set cache-folder "$cacheDir/yarn"
yarn kbn bootstrap --frozen-lockfile
