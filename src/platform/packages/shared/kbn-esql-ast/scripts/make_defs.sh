#!/bin/bash

# Wrapper script to handle path parameter for make:defs
if [ -z "$1" ]; then
    echo "Error: Path to Elasticsearch is required"
    echo "Usage: $0 /path/to/elasticsearch"
    exit 1
fi

ELASTICSEARCH_PATH="$1"

# Run both scripts with the provided path
ts-node --transpileOnly ./scripts/generate_function_definitions.ts "$ELASTICSEARCH_PATH" && \
ts-node --transpileOnly ./scripts/generate_command_definitions.ts "$ELASTICSEARCH_PATH" && \
ts-node --transpileOnly ./scripts/generate_settings.ts "$ELASTICSEARCH_PATH"
