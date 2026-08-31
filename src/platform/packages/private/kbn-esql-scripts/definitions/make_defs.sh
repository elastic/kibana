#!/bin/bash

# Wrapper script to handle path parameter for make:defs
if [ -z "$1" ]; then
    echo "Error: Path to Elasticsearch is required"
    echo "Usage: $0 /path/to/elasticsearch"
    exit 1
fi

ELASTICSEARCH_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure local node_modules are installed (yarn kbn bootstrap skips this standalone package)
if [ ! -f "$PKG_DIR/node_modules/.bin/ts-node" ]; then
  echo "Installing kbn-esql-scripts dependencies..."
  (cd "$PKG_DIR" && npm ci)
fi

TS_NODE="$PKG_DIR/node_modules/.bin/ts-node"

# Run all definition scripts with the provided path
"$TS_NODE" --project "$PKG_DIR/tsconfig.scripts.json" --transpileOnly "$SCRIPT_DIR/generate_function_definitions.ts" "$ELASTICSEARCH_PATH" && \
"$TS_NODE" --project "$PKG_DIR/tsconfig.scripts.json" --transpileOnly "$SCRIPT_DIR/generate_command_definitions.ts" "$ELASTICSEARCH_PATH" && \
"$TS_NODE" --project "$PKG_DIR/tsconfig.scripts.json" --transpileOnly "$SCRIPT_DIR/generate_settings.ts" "$ELASTICSEARCH_PATH"
