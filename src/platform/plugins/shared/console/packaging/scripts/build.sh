#!/bin/bash

# Exit on any error
set -e

# Default output directory
OUTPUT_DIR="../../../console/packaging/target"

# Set directory variables
KIBANA_ROOT="../../../../../../.."
CONSOLE_PACKAGING_DIR="$(pwd)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir|-o)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--output-dir|-o <directory>]"
      echo "  --output-dir, -o    Output directory for build assets (default: ../../../console/packaging/target)"
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
cd "$KIBANA_ROOT" && node scripts/extract_plugin_translations.js --output-dir src/platform/plugins/shared/console/packaging/react/translations --starts-with "console."
cd "$CONSOLE_PACKAGING_DIR"

# echo "Generate console definitions..."
# ./generate_console_definitions.sh

echo "Building JavaScript and CSS..."
cd "$KIBANA_ROOT" && NODE_ENV=production BUILD_OUTPUT_DIR="$OUTPUT_DIR" yarn webpack --config src/platform/plugins/shared/console/packaging/webpack.config.js
cd "$CONSOLE_PACKAGING_DIR"

echo "Build react TS definitions..."
npx tsc ../react/types.ts --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/index.d.ts" --skipLibCheck

echo "Build complete! Files generated in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR/"
