#!/usr/bin/env bash

set -euo pipefail

echo '--- Install/build buildkite dependencies'

if [[ "$(type -t retry)" != "function" ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/util.sh"
fi

# `rm -rf <ts-node node_modules dir>; npm install -g ts-node` will cause ts-node bin files to be messed up
# but literally just calling `npm install -g ts-node` a second time fixes it
# this is only on newer versions of npm
npm_install_global ts-node
if ! ts-node --version; then
  npm_install_global ts-node
  ts-node --version;
fi

cd '.buildkite'
retry 5 15 npm ci
cd -
