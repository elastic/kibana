#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"/tmp/kibana"}"


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
### setting up yarn
###
yarnVersion="1.3.2"
yarnDir="$cacheDir/yarn/$yarnVersion"

echo " -- using vendored version of yarn"
mkdir -p "$yarnDir/bin"
cp "$dir/tasks/vendor/yarn-1.3.2-with-ignore-fix.js" "$yarnDir/bin/yarn"

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
yarn
