#!/bin/bash

# Exit on any error
set -e

echo "Generate translations..."
./extract_console_translations.sh

echo "Generate console definitions..."
./generate_console_definitions.sh

echo "Building JavaScript and CSS..."
npx webpack --config webpack.config.js

echo "Build TypeScript definitions..."
npx tsc types.ts --declaration --emitDeclarationOnly --outFile ../target/index.d.ts --skipLibCheck

echo "Build complete! Files generated:"
ls -la ../target/
