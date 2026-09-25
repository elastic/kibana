#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Setup Node"

NODE_VERSION="$(cat "$KIBANA_DIR/.node-version")"
export NODE_VERSION
NODE_VARIANT=""
mkdir -p "$NODE_CACHE_DIR"
if [[ "${CI_FORCE_NODE_POINTER_COMPRESSION:-}" = "true" ]]; then
  echo ' -- Using Node.js variant with pointer compression enabled'
  NODE_VARIANT="node-pointer-compression/"
  export NODE_DIR="$NODE_CACHE_DIR/node-pointer-compression/$NODE_VERSION"
elif [[ "${CI_FORCE_NODE_GLIBC_217:-}" = "true" ]]; then
  echo ' -- Using Node.js variant compatible with glibc 2.17'
  NODE_VARIANT="node-glibc-217/"
  export NODE_DIR="$NODE_CACHE_DIR/node-glibc-217/$NODE_VERSION"
else
  export NODE_DIR="$NODE_CACHE_DIR/node/$NODE_VERSION"
  echo ' -- Using default Node.js'
fi
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

nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/${NODE_VARIANT}dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${OS}-${classifier}"

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

echo " -- node: version=$(node --version)"

echo " -- enabling pnpm"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Keep corepack state and shims under the Node cache. Official Node 24
# ships corepack and can write to $NODE_BIN_DIR; the experiment's 26.8.1
# tarball may omit corepack, and the agent corepack tries /usr/bin (EACCES).
export COREPACK_HOME="${NODE_CACHE_DIR}/corepack"
mkdir -p "$COREPACK_HOME"
PNPM_VERSION="$(node -p "require('${KIBANA_DIR}/package.json').engines.pnpm.replace(/^[^\d]*/, '')")"
if command -v corepack >/dev/null 2>&1 &&
  corepack enable --install-directory "$NODE_BIN_DIR" &&
  corepack prepare "pnpm@${PNPM_VERSION}" --activate; then
  echo " -- pnpm from corepack"
else
  echo " -- corepack unavailable; installing pnpm@${PNPM_VERSION} with npm"
  npm install -g "pnpm@${PNPM_VERSION}"
fi
echo " -- pnpm: version=$(pnpm --version)"
