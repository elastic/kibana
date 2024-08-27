#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

export PATH="$HOME/.codeql:$PATH"

echo "--- Check version"
codeql version
