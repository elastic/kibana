#!/bin/bash

NODE_OPTIONS="--max-old-space-size=8192" NODE_NO_WARNINGS=1 \
node packages/kbn-dependency-usage/src/cli.ts "$@"
