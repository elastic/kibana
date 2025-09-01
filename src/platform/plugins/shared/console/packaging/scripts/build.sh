#!/bin/bash

# Exit on any error
set -e

# Default output directory
OUTPUT_DIR="../target"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir|-o)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--output-dir|-o <directory>]"
      echo "  --output-dir, -o    Output directory for build assets (default: ../target)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Convert to absolute path if relative
if [[ ! "$OUTPUT_DIR" = /* ]]; then
  OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Building to output directory: $OUTPUT_DIR"

echo "Generate translations..."
node ../../../../../../scripts/extract_plugin_translations.js --output-dir ../translations --starts-with "console."

echo "Generate console definitions..."
./generate_console_definitions.sh

echo "Building JavaScript and CSS..."
BUILD_OUTPUT_DIR="$OUTPUT_DIR" npx webpack --config webpack.config.js

echo "Build react TS definitions..."
npx tsc react/types.ts --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/react/index.d.ts" --skipLibCheck

echo "Build server TS definitions..."
npx tsc server/types.ts --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/server/index.d.ts" --skipLibCheck

echo "Build complete! Files generated:"
ls -la "$OUTPUT_DIR/"
