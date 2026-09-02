#!/bin/bash

# Wrapper script to handle path parameter for make:defs
if [ -z "$1" ]; then
    echo "Error: Path to Elasticsearch is required"
    echo "Usage: $0 /path/to/elasticsearch"
    exit 1
fi

ELASTICSEARCH_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# LMDB SWC cache can deadlock process.exit after loading large @kbn TS graphs.
export DISABLE_SWC_REGISTER_CACHE=1
RUN_TS=(node --no-experimental-strip-types -r @kbn/swc-register/install)

"${RUN_TS[@]}" "$SCRIPT_DIR/generate_function_definitions.ts" "$ELASTICSEARCH_PATH" && \
"${RUN_TS[@]}" "$SCRIPT_DIR/generate_command_definitions.ts" && \
"${RUN_TS[@]}" "$SCRIPT_DIR/generate_settings.ts"
