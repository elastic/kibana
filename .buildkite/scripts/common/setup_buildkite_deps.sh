#!/usr/bin/env bash

set -euo pipefail

echo '--- Install/build buildkite dependencies'

if [[ "$(type -t retry)" != "function" ]]; then
  source "$(dirname "${BASH_SOURCE[0]}")/util.sh"
fi

cd '.buildkite'
retry 5 15 npm ci
cd -
