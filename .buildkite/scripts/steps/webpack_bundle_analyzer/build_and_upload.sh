#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

export NODE_OPTIONS="--max-old-space-size=8192"

node scripts/build_kibana_platform_plugins.js --dist --profile

mkdir -p built_assets/webpack_bundle_analyzer
find . -path "*target/public/*" -name "stats.json" | while read line; do
  PLUGIN=$(echo $line | xargs dirname | xargs dirname | xargs dirname | xargs basename)
  ./node_modules/.bin/webpack-bundle-analyzer $line --report "built_assets/webpack_bundle_analyzer/$PLUGIN.html" --mode static --no-open
done

ts-node .buildkite/scripts/steps/webpack_bundle_analyzer/upload.ts
