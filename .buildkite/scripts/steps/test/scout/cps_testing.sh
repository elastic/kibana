#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATH="x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/ui/playwright.config.ts"

echo "--- Cross Project Search (CPS) UI Tests"
echo "Config: $CONFIG_PATH"
echo "Server config set: cps_local (origin + linked ES clusters)"

node scripts/scout run-tests \
  --location local \
  --serverConfigSet cps_local \
  --arch serverless \
  --domain security_complete \
  --config "$CONFIG_PATH" \
  --kibanaInstallDir "$KIBANA_BUILD_LOCATION"
