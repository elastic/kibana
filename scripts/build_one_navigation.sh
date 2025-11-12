#!/bin/bash

# Convenience script to build one-navigation bundle
# Calls the actual build script in the navigation packaging directory

set -e

# Load nvm and use the correct Node.js version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_SCRIPT="$KIBANA_ROOT/src/core/packages/chrome/navigation/packaging/scripts/build.sh"

# Check if build script exists
if [[ ! -f "$BUILD_SCRIPT" ]]; then
  echo "Error: Build script not found at $BUILD_SCRIPT"
  exit 1
fi

echo "Building @kbn/one-navigation..."

# Change to the build script directory and run it
cd "$(dirname "$BUILD_SCRIPT")"
./build.sh "$@"

echo "✓ Build complete"

