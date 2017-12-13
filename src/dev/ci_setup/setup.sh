#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"/tmp/kibana"}"


###
### check that we seem to be in a kibana project
###
if [ -f "$dir/package.json" ] && [ -f "$dir/.node-version" ]; then
  echo "Setting up node.js and npm in $dir"
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
### "install" node by extending the path with it's bin directory
###
export PATH="$nodeDir/bin:$PATH"


###
### install dependencies
###
echo " -- installing node.js dependencies"
npm install --cache "$cacheDir/npm"
