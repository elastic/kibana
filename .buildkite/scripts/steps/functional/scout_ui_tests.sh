#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

KIBANA_DIR="$KIBANA_BUILD_LOCATION"

run_tests() {
  local suit_name=$1
  local config_path=$2
  local run_mode=$3
  local run_mode_param=""

  case "$run_mode" in
      "Stateful")
      run_mode_param="--stateful"
      ;;
      "Serverless Elasticsearch")
      run_mode_param="--serverless=es"
      ;;
      "Serverless Observability")
      run_mode_param="--serverless=oblt"
      ;;
      "Serverless Security")
      run_mode_param="--serverless=security"
      ;;
      *)
      echo "Unknown run mode: $run_mode"
      exit 1
      ;;
    esac

    echo "--- $suit_name ($run_mode) UI Tests"
    if ! node scripts/scout run-tests "$run_mode_param" --config "$config_path" --kibana-install-dir "$KIBANA_DIR"; then
      echo "$suit_name: failed"
      EXIT_CODE=1
    else
      echo "$suit_name: passed"
    fi
}

EXIT_CODE=0

# Discovery Enhanced
for run_mode in "Stateful" "Serverless Elasticsearch" "Serverless Observability" "Serverless Security"; do
  run_tests "Discovery Enhanced" "x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts" "$run_mode"
done

# Observability Onboarding
for run_mode in "Stateful" "Serverless Observability"; do
  run_tests "Observability Onboarding" "x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts" "$run_mode"
done


exit $EXIT_CODE
