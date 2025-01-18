#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Setup Node"

NODE_VERSION="$(cat "$KIBANA_DIR/.node-version")"
export NODE_VERSION
export NODE_DIR="$CACHE_DIR/node/$NODE_VERSION"
export NODE_BIN_DIR="$NODE_DIR/bin"

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

NODE_VARIANT=""
if [[ "${CI_FORCE_NODE_POINTER_COMPRESSION:-}" = "true" ]]; then
  NODE_VARIANT="node-pointer-compression/"
  # Node.js 20.15.1 with pointer compression enabled
  sed -i 's#kibana-ci-proxy-cache/dist#kibana-ci-proxy-cache/node-pointer-compression/dist#' WORKSPACE.bazel
  sed -i 's#"node-v20.15.1-linux-arm64", "c049d670df0c27ae2fd53446df79b6227ab23aff930e38daf0ab3da41c396db5"#"node-v20.15.1-linux-arm64", "a86b4697e38cd500d434e6c94e4d5446e23a8e2826de7e7eafad160af2375aa9"#' WORKSPACE.bazel
  sed -i 's#"node-v20.15.1-linux-x64", "a854c291c7b775bedab54251e1e273cfee1adf1dba25435bc52305ef41f143ab"#"node-v20.15.1-linux-x64", "d7990d99dcb165eca7305dd895ddd5b2a490b7c2b624136d2fc83004bc0f2d2d"#' WORKSPACE.bazel
  echo ' -- Using Node.js variant with pointer compression enabled'
fi
nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/${NODE_VARIANT}dist/v$NODE_VERSION/node-v$NODE_VERSION-${OS}-${classifier}"

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
  npm_install_global yarn "^$YARN_VERSION"
fi

YARN_GLOBAL_BIN=$(yarn global bin)
export YARN_GLOBAL_BIN
export PATH="$PATH:$YARN_GLOBAL_BIN"
