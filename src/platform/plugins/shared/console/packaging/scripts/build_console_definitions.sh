#!/bin/bash

# Exit on any error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSOLE_DEFINITIONS_DIR="$SCRIPT_DIR/console_definitions"

echo "Building console definitions to: $(realpath "$SCRIPT_DIR/../console_definitions_target")"

echo "Generate console definitions..."
cd "$CONSOLE_DEFINITIONS_DIR"
bash generate_console_definitions.sh

echo "Aggregate definitions..."
node generate_aggregated_definitions.js

echo "Build complete! Files generated in: $(realpath "$SCRIPT_DIR/../console_definitions_target")"
ls -la "$SCRIPT_DIR/../console_definitions_target/" 2>/dev/null || echo "Output directory will be created when definitions are generated"
