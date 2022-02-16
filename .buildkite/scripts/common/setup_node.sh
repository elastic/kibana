#!/usr/bin/env bash

echo "--- Setup Node"

NODE_VERSION="$(cat "$KIBANA_DIR/.node-version")"
export NODE_VERSION
export NODE_DIR="$CACHE_DIR/node/$NODE_VERSION"
export NODE_BIN_DIR="$NODE_DIR/bin"
export YARN_OFFLINE_CACHE="$CACHE_DIR/yarn-offline-cache"

## Install node for whatever the current os/arch are
hostArch="$(command uname -m)"
case "${hostArch}" in
  x86_64 | amd64) nodeArch="x64" ;;
  aarch64) nodeArch="arm64" ;;
  *) nodeArch="${hostArch}" ;;
esac
classifier="$nodeArch.tar.gz"

UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
  NODE_BIN_DIR="$HOME/node"
  classifier="x64.zip"
elif [[ "$UNAME" == "Darwin" ]]; then
  OS="darwin"
fi
echo " -- Running on OS: $OS"

nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$NODE_VERSION/node-v$NODE_VERSION-${OS}-${classifier}"

echo " -- node: version=v${NODE_VERSION} dir=$NODE_DIR"

echo " -- setting up node.js"
if [ -x "$NODE_BIN_DIR/node" ] && [ "$("$NODE_BIN_DIR/node" --version)" == "v$NODE_VERSION" ]; then
  echo " -- reusing node.js install"
else
  if [ -d "$NODE_DIR" ]; then
    echo " -- clearing previous node.js install"
    rm -rf "$NODE_DIR"
  fi

  echo " -- downloading node.js from $nodeUrl"
  mkdir -p "$NODE_DIR"
  if [[ "$OS" == "win" ]]; then
    nodePkg="$NODE_DIR/${nodeUrl##*/}"
    curl --silent -L -o "$nodePkg" "$nodeUrl"
    unzip -qo "$nodePkg" -d "$NODE_DIR"
    mv "${nodePkg%.*}" "$NODE_BIN_DIR"
  else
    curl --silent -L "$nodeUrl" | tar -xz -C "$NODE_DIR" --strip-components=1
  fi
fi

export PATH="$NODE_BIN_DIR:$PATH"

echo "--- Setup Yarn"

YARN_VERSION=$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")
export YARN_VERSION

if [[ ! $(which yarn) || $(yarn --version) != "$YARN_VERSION" ]]; then
  rm -rf "$(npm root -g)/yarn" # in case the directory is in a bad state
  if [[ ! $(npm install -g "yarn@^${YARN_VERSION}") ]]; then
    # If this command is terminated early, e.g. because the build was cancelled in buildkite,
    # a yarn directory is left behind in a bad state that can cause all subsequent installs to fail
    rm -rf "$(npm root -g)/yarn"
    echo "Trying again to install yarn..."
    npm install -g "yarn@^${YARN_VERSION}"
  fi
fi

yarn config set yarn-offline-mirror "$YARN_OFFLINE_CACHE"

YARN_GLOBAL_BIN=$(yarn global bin)
export YARN_GLOBAL_BIN
export PATH="$PATH:$YARN_GLOBAL_BIN"
