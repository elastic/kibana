#!/bin/bash

# Exit on any error
set -e

# Resolve paths relative to this script's location so the script works
# regardless of the caller's working directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(cd "$SCRIPT_DIR/../../../../../../.." && pwd)"
CONSOLE_PACKAGING_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default output directory
OUTPUT_DIR="$CONSOLE_PACKAGING_DIR/target"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir|-o)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--output-dir|-o <directory>]"
      echo "  --output-dir, -o    Output directory for build assets (default: <packaging>/target)"
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
# tsc --outFile wraps everything in 'declare module "types" { ... }' which is
# not usable as a package declaration. Compile first, then strip the wrapper,
# dedent, and append the OneConsole component export.
"$KIBANA_ROOT/node_modules/.bin/tsc" "$CONSOLE_PACKAGING_DIR/react/types.ts" --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/index.d.ts" --skipLibCheck
node -e "
  const fs = require('fs');
  let src = fs.readFileSync('$OUTPUT_DIR/index.d.ts', 'utf8');
  // Strip 'declare module \"types\" {' header line and closing '}'
  src = src
    .split('\n')
    .filter(l => !l.match(/^declare module \"types\" \{/))
    .join('\n')
    .replace(/\n\}\n?$/, '\n');
  // Dedent 4 spaces added by the module wrapper
  src = src.split('\n').map(l => l.startsWith('    ') ? l.slice(4) : l).join('\n').trimEnd();
  // Append the component export (no React import needed — 'any' keeps it portable)
  src += '\nexport declare function OneConsole(props: OneConsoleProps): any;\n';
  fs.writeFileSync('$OUTPUT_DIR/index.d.ts', src);
"

echo "Build complete! Files generated in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR/"
