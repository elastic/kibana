#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

KIBANA_DIR="$KIBANA_BUILD_LOCATION"

run_tests() {
  local suit_name=$1
  local config_path=$2
  local run_mode=$3

  echo "--- $suit_name ($run_mode) UI Tests"
  if ! node scripts/scout run-tests "$run_mode" --config "$config_path" --kibana-install-dir "$KIBANA_DIR"; then
    echo "$suit_name: failed"
    EXIT_CODE=1
  else
    echo "$suit_name: passed"
  fi
}

EXIT_CODE=0

# Discovery Enhanced && Maps
for run_mode in "--stateful" "--serverless=es" "--serverless=oblt" "--serverless=security"; do
  run_tests "Discovery Enhanced: Parallel Workers" "x-pack/platform/plugins/private/discover_enhanced/ui_tests/parallel.playwright.config.ts" "$run_mode"
  run_tests "Discovery Enhanced" "x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts" "$run_mode"
  run_tests "Maps" "x-pack/platform/plugins/shared/maps/ui_tests/playwright.config.ts" "$run_mode"
done

# Observability Onboarding
for run_mode in "--stateful" "--serverless=oblt"; do
  run_tests "Observability Onboarding: Parallel Workers" "x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/parallel.playwright.config.ts" "$run_mode"
  # Disabled while we don't have any tests under the config
  # run_tests "Observability Onboarding" "x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts" "$run_mode"
done


exit $EXIT_CODE