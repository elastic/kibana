#!/bin/bash

# Script to generate aggregated console API definitions
# This script loops through version folders in server/console_definitions/
# and creates a single JSON file that mimics the /api/console/api_server response

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Console API Definitions Aggregator ==="
echo "Script directory: $SCRIPT_DIR"

cd "$SCRIPT_DIR/.."

# Run the JavaScript aggregation script
node scripts/generate_aggregated_definitions.js

echo ""
echo "Versioned definition files are now available in:"
echo "$(realpath "$SCRIPT_DIR/../server/console_definitions/")"
echo "Look for files like: 9.0.json, 9.1.json, etc."