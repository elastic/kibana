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

NODE_VARIANT="node-glibc-217/"
if [[ "${CI_FORCE_NODE_POINTER_COMPRESSION:-}" = "true" ]]; then
  NODE_VARIANT="node-pointer-compression/"
  # Node.js 22.17.1 with pointer compression enabled
  sed -i 's#kibana-ci-proxy-cache/dist#kibana-ci-proxy-cache/node-pointer-compression/dist#' WORKSPACE.bazel
  sed -i 's#"node-v22.17.1-linux-arm64", "37bb596033e6477b5cec845ab18fd02bc6dc8af846f1ace813a005e91298e9ea"#"node-v22.17.1-linux-arm64", "303d5c5986ba5e587350c1012937dab691906e143294e4e72f6c3ee8c0d2eb4b"#' WORKSPACE.bazel
  sed -i 's#"node-v22.17.1-linux-x64", "45431ec948e80f63819de4767581e838119bc9a13daa15805b205f447d086bee"#"node-v22.17.1-linux-x64", "3f701a570adc1d58af85393cb154f5bd363225cdd1658d6dd6b93d2bbfe6f33e"#' WORKSPACE.bazel
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
