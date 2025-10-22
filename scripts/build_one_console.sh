#!/bin/bash

# Convenience script to build one-console bundle
# Calls the actual build script in the console packaging directory

# Exit on any error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(dirname "$SCRIPT_DIR")"

# Path to the actual build script
BUILD_SCRIPT="$KIBANA_ROOT/src/platform/plugins/shared/console/packaging/scripts/build.sh"

# Check if the build script exists
if [[ ! -f "$BUILD_SCRIPT" ]]; then
  echo "Error: Build script not found at $BUILD_SCRIPT"
  exit 1
fi

# Change to the build script directory and run it with all passed arguments
cd "$(dirname "$BUILD_SCRIPT")"
./build.sh "$@"