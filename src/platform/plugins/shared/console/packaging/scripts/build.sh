#!/bin/bash

# Exit on any error
set -e

echo "Generate translations..."
./extract_console_translations.sh

echo "Generate console definitions..."
./generate_console_definitions.sh

echo "Building JavaScript and CSS..."
npx webpack --config webpack.config.js

echo "Build react TS definitions..."
npx tsc react/types.ts --declaration --emitDeclarationOnly --outFile ../target/react/index.d.ts --skipLibCheck

echo "Build server TS definitions..."
npx tsc server/types.ts --declaration --emitDeclarationOnly --outFile ../target/server/index.d.ts --skipLibCheck

echo "Build complete! Files generated:"
ls -la ../target/
