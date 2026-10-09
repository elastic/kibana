#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# LMDB SWC cache can deadlock process.exit after loading large @kbn TS graphs.
export DISABLE_SWC_REGISTER_CACHE=1
RUN_TS=(node --no-experimental-strip-types -r @kbn/swc-register/install)

"${RUN_TS[@]}" "$SCRIPT_DIR/generate_function_definitions.ts" && \
"${RUN_TS[@]}" "$SCRIPT_DIR/generate_command_definitions.ts" && \
"${RUN_TS[@]}" "$SCRIPT_DIR/generate_settings.ts"
