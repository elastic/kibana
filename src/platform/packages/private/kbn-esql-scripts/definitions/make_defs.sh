#!/bin/bash

# Wrapper script to handle path parameter for make:defs
if [ -z "$1" ]; then
    echo "Error: Path to Elasticsearch is required"
    echo "Usage: $0 /path/to/elasticsearch"
    exit 1
fi

ELASTICSEARCH_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run all definition scripts with the provided path
ts-node --transpileOnly "$SCRIPT_DIR/generate_function_definitions.ts" "$ELASTICSEARCH_PATH" && \
ts-node --transpileOnly "$SCRIPT_DIR/generate_command_definitions.ts" "$ELASTICSEARCH_PATH" && \
ts-node --transpileOnly "$SCRIPT_DIR/generate_settings.ts" "$ELASTICSEARCH_PATH"
