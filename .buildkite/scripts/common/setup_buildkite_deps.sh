#!/usr/bin/env bash

set -euo pipefail

echo '--- Install/build buildkite dependencies'

if [[ "$(type -t retry)" != "function" ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/util.sh"
fi

cd '.buildkite'
retry 5 15 npm ci --no-audit
BIN_DIR="$(npm root)/.bin"
cd -

mkdir -p "$HOME/.kibana-buildkite/bin"
ln -sf "$BIN_DIR/yarn" "$HOME/.kibana-buildkite/bin/yarn"
ln -sf "$BIN_DIR/ts-node" "$HOME/.kibana-buildkite/bin/ts-node"

export PATH="$HOME/.kibana-buildkite/bin:$PATH"

echo "yarn: $(yarn --version)"
echo "ts-node: $(ts-node --version)"
