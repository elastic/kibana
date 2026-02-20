#!/bin/bash

# Convenience script to build @kbn/one-navigation from the repo root.

set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_SCRIPT="$KIBANA_ROOT/src/core/packages/chrome/navigation/packaging/scripts/build.sh"

if [[ ! -f "$BUILD_SCRIPT" ]]; then
  echo "Error: Build script not found at $BUILD_SCRIPT"
  exit 1
fi

echo "Building @kbn/one-navigation..."
cd "$(dirname "$BUILD_SCRIPT")"
./build.sh "$@"
echo "Build complete."
