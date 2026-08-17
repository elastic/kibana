#!/bin/bash

# Node 24 runs TypeScript natively, including ESM-only dependencies.
NODE_OPTIONS="--max-old-space-size=8192" \
node packages/kbn-dependency-usage/src/cli.ts "$@"
