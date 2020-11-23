#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/util.sh"

tc_start_block "Setup Node"

tc_set_env NODE_VERSION "$(cat "$KIBANA_DIR/.node-version")"
tc_set_env NODE_DIR "$CACHE_DIR/node/$NODE_VERSION"
tc_set_env NODE_BIN_DIR "$NODE_DIR/bin"
tc_set_env YARN_OFFLINE_CACHE "$CACHE_DIR/yarn-offline-cache"

if [[ ! -d "$NODE_DIR" ]]; then
  nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz"

  echo "node.js v$NODE_VERSION not found at $NODE_DIR, downloading from $nodeUrl"

  mkdir -p "$NODE_DIR"
  curl --silent -L "$nodeUrl" | tar -xz -C "$NODE_DIR" --strip-components=1
else
  echo "node.js v$NODE_VERSION already installed to $NODE_DIR, re-using"
  ls -alh "$NODE_BIN_DIR"
fi

tc_set_env PATH "$NODE_BIN_DIR:$PATH"

tc_end_block "Setup Node"
tc_start_block "Setup Yarn"

tc_set_env YARN_VERSION "$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"

if [[ ! $(which yarn) || $(yarn --version) != "$YARN_VERSION" ]]; then
  npm install -g "yarn@^${YARN_VERSION}"
fi

yarn config set yarn-offline-mirror "$YARN_OFFLINE_CACHE"

tc_set_env YARN_GLOBAL_BIN "$(yarn global bin)"
tc_set_env PATH "$PATH:$YARN_GLOBAL_BIN"

tc_end_block "Setup Yarn"
