#!/bin/bash

# Wrapper script to handle path parameter for make:defs
if [ -z "$1" ]; then
    echo "Error: Path to Elasticsearch is required"
    echo "Usage: $0 /path/to/elasticsearch"
    exit 1
fi

ELASTICSEARCH_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run both scripts with the provided path
ts-node --transpileOnly "$SCRIPT_DIR/generate_esql_command_docs.ts" "$ELASTICSEARCH_PATH" && \
ts-node --transpileOnly "$SCRIPT_DIR/generate_esql_docs.ts" "$ELASTICSEARCH_PATH"
