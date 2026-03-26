#!/bin/bash

# Build script for @kbn/one-navigation standalone package.
#
# Steps:
#   1. Validate types (packaging types match source types).
#   2. Bundle via webpack (source + aliases -> single JS file).
#   3. Generate TypeScript declarations from the standalone types.
#   4. Copy package.json into the output directory.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGING_DIR="$(dirname "$SCRIPT_DIR")"
NAV_ROOT="$(dirname "$PACKAGING_DIR")"
TARGET_DIR="${BUILD_OUTPUT_DIR:-$NAV_ROOT/target}"

echo "==> Step 1: Type validation"
npx tsc --project "$PACKAGING_DIR/tsconfig.json" --noEmit
echo "    Types OK"

echo "==> Step 2: Webpack bundle"
npx webpack --config "$PACKAGING_DIR/webpack.config.js"
echo "    Bundle OK"

echo "==> Step 3: TypeScript declarations"
npx tsc "$PACKAGING_DIR/react/types.ts" \
  --declaration --emitDeclarationOnly \
  --outFile "$TARGET_DIR/index.d.ts" \
  --skipLibCheck
echo "    Declarations OK"

echo "==> Step 4: Package manifest"
cp "$PACKAGING_DIR/package.json" "$TARGET_DIR/package.json"
echo "    Manifest OK"

echo ""
echo "Build artifacts in: $TARGET_DIR"
