#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

export NODE_OPTIONS="--max-old-space-size=8192"

node scripts/build_kibana_platform_plugins.js --dist --profile-stats-only

# The Rspack optimizer emits a single unified stats.json for all plugin bundles.
# Without --profile-focus the stats carry chunk/asset detail only (module-level
# detail for every plugin exceeds the JS string length limit).
mkdir -p built_assets/webpack_bundle_analyzer
./node_modules/.bin/webpack-bundle-analyzer target/public/bundles/stats.json --report "built_assets/webpack_bundle_analyzer/kibana.html" --mode static --no-open

ts-node .buildkite/scripts/steps/webpack_bundle_analyzer/upload.ts
