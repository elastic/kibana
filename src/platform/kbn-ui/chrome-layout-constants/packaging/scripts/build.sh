#!/bin/bash

# Build script for @kbn/ui-chrome-layout-constants standalone package.
#
# Steps:
#   1. Validate types.
#   2. Bundle via webpack (pure TS — no runtime deps, no externals).
#   3. Generate TypeScript declarations from standalone types.ts.
#   4. Copy package.json into output directory.
#   5. Stamp a content-hash version.
#   6. Generate metadata.json.
#   7. Pack into .tgz.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGING_DIR="$(dirname "$SCRIPT_DIR")"
PKG_ROOT="$(dirname "$PACKAGING_DIR")"
KBN_UI_ROOT="$(dirname "$PKG_ROOT")"
KIBANA_ROOT="$(cd "$KBN_UI_ROOT/../../.." && pwd)"
TOOLING_DIR="$KBN_UI_ROOT/_tooling"
TARGET_DIR="${BUILD_OUTPUT_DIR:-$PKG_ROOT/target}"
KBN_BIN="$KIBANA_ROOT/node_modules/.bin"

echo "==> Step 1: Type validation"
"$KBN_BIN/tsc" --project "$PACKAGING_DIR/tsconfig.json" --noEmit
echo "    Types OK"

echo "==> Step 2: Webpack bundle"
"$KBN_BIN/webpack" --config "$PACKAGING_DIR/webpack.config.js"
echo "    Bundle OK"

echo "==> Step 3: TypeScript declarations"
"$KBN_BIN/tsc" "$PACKAGING_DIR/types.ts" \
  --declaration --emitDeclarationOnly \
  --outDir "$TARGET_DIR" \
  --rootDir "$PACKAGING_DIR" \
  --moduleResolution node \
  --esModuleInterop \
  --skipLibCheck
mv "$TARGET_DIR/types.d.ts" "$TARGET_DIR/index.d.ts"
echo "    Declarations OK"

echo "==> Step 4: Package manifest"
cp "$PACKAGING_DIR/package.json" "$TARGET_DIR/package.json"
echo "    Manifest OK"

echo "==> Step 5: Stamp version"
node "$TOOLING_DIR/stamp_version.js" "$TARGET_DIR"
echo "    Version stamped"

echo "==> Step 6: Build metadata"
node "$TOOLING_DIR/metadata.js" "$TARGET_DIR"
echo "    Metadata OK"

echo "==> Step 7: Tarball"
rm -f "$TARGET_DIR"/*.tgz
(cd "$TARGET_DIR" && npm pack --force --pack-destination "$TARGET_DIR" >/dev/null)
TARBALL="$(ls -t "$TARGET_DIR"/*.tgz | head -1)"
echo "    Tarball: $(basename "$TARBALL")"

echo ""
echo "Build artifacts in: $TARGET_DIR"
