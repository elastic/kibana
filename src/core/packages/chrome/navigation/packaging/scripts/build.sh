#!/bin/bash

# Exit on any error
set -e

# Load nvm and use the correct Node.js version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use

# Default output directory
OUTPUT_DIR="${1:-$(pwd)/../target}"

# Convert to absolute path if relative
if [[ ! "$OUTPUT_DIR" = /* ]]; then
  OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Building to output directory: $OUTPUT_DIR"

# Get directories
PACKAGING_DIR="$(cd .. && pwd)"
KIBANA_ROOT="$(cd ../../../../.. && pwd)"

echo "Step 1: Building JavaScript with webpack..."
cd "$KIBANA_ROOT"
NODE_ENV=production BUILD_OUTPUT_DIR="$OUTPUT_DIR" \
  yarn webpack --config src/core/packages/chrome/navigation/packaging/webpack.config.js

echo "Step 2: Generating TypeScript definitions..."
cd "$PACKAGING_DIR"
npx tsc react/types.ts --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/index.d.ts" --skipLibCheck

echo "Step 3: Copying package.json and cleaning up..."
cp package.json "$OUTPUT_DIR/package.json"

# Remove validation artifacts (only used for type checking during build)
rm -f "$OUTPUT_DIR/_validation.js" "$OUTPUT_DIR/_validation.js.map"

# Remove leftover types directory and tsbuildinfo (from earlier testing/builds)
rm -rf "$OUTPUT_DIR/types" "$OUTPUT_DIR/index.tsbuildinfo"

echo "Build complete! Files generated in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR/"
