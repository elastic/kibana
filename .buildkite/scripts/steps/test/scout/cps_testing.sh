#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

CONFIG_PATHS=(
  "x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/ui/playwright.config.ts"
  "x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/api/playwright.config.ts"
  "x-pack/solutions/security/plugins/entity_store/test/scout_cps_local/api/playwright.config.ts"
)

OBSERVABILITY_CONFIG_PATHS=(
  "x-pack/platform/plugins/shared/significant_events/test/scout_cps_local/api/playwright.config.ts"
)

SPACES_CPS_CONFIG="x-pack/platform/plugins/shared/spaces/test/scout_cps_local/ui/playwright.config.ts"

echo "--- Cross Project Search (CPS) Tests"
echo "Server config set: cps_local (origin + linked ES clusters)"

EXIT_CODE=0

run_cps_tests() {
  local config_path="$1"
  local domain="$2"

  echo ""
  echo "--- Running CPS tests for $config_path (domain=$domain)"

  if ! node scripts/scout run-tests \
    --location local \
    --serverConfigSet cps_local \
    --arch serverless \
    --domain "$domain" \
    --config "$config_path" \
    --kibanaInstallDir "$KIBANA_BUILD_LOCATION"; then
    echo "^^^ +++ FAILED: $config_path ($domain)"
    EXIT_CODE=1
  fi
}

for CONFIG_PATH in "${CONFIG_PATHS[@]}"; do
  run_cps_tests "$CONFIG_PATH" "security_complete"
done

for CONFIG_PATH in "${OBSERVABILITY_CONFIG_PATHS[@]}"; do
  run_cps_tests "$CONFIG_PATH" "observability_complete"
done

# Spaces project-routing visibility/save/capability coverage across eligible and
# ineligible Security + Observability tiers.
for DOMAIN in \
  security_complete \
  security_essentials \
  observability_complete \
  observability_logs_essentials; do
  run_cps_tests "$SPACES_CPS_CONFIG" "$DOMAIN"
done

exit "$EXIT_CODE"
