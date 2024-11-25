#!/bin/bash

# Need to tun the script with ts-node/esm since dependency-cruiser is only available as an ESM module.
# We specify the correct tsconfig.json file to ensure compatibility, as our current setup doesn’t fully support ESM modules.
# Should be resolved after https://github.com/elastic/kibana/issues/198790 is done.
NODE_NO_WARNINGS=1 TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT=packages/kbn-dependency-usage/tsconfig.json \
node --loader ts-node/esm packages/kbn-dependency-usage/src/cli.ts "$@"
