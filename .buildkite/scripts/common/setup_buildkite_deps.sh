#!/usr/bin/env bash

set -euo pipefail

echo '--- Install/build buildkite dependencies'

if [[ "$(type -t retry)" != "function" ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/util.sh"
fi

# `rm -rf <tsx node_modules dir>; npm install -g tsx` will cause tsx bin files to be messed up
# but literally just calling `npm install -g tsx` a second time fixes it
# this is only on newer versions of npm
npm_install_global tsx
if ! tsx --version; then
  npm_install_global tsx
  tsx --version;
fi

cd '.buildkite'
retry 5 15 npm ci
cd -
