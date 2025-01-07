#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-scout-ui-tests

declare -A TEST_CONFIGS=(
  ["Discovery Enhanced"]="x-pack/platform/plugins/private/discover_enhanced/ui_tests/playwright.config.ts"
  ["Observability Onboarding"]="x-pack/solutions/observability/plugins/observability_onboarding/ui_tests/playwright.config.ts"
)
RUN_MODES_ORDER=("Stateful" "Serverless Elasticsearch" "Serverless Observability" "Serverless Security")
KIBANA_DIR="$KIBANA_BUILD_LOCATION"
EXIT_CODE=0

for SUITE_NAME in "${!TEST_CONFIGS[@]}"; do
  CONFIG_PATH="${TEST_CONFIGS[$SUITE_NAME]}"

  for RUN_MODE_NAME in "${RUN_MODES_ORDER[@]}"; do
    case "$RUN_MODE_NAME" in
      "Stateful")
      RUN_MODE="--stateful"
      ;;
      "Serverless Elasticsearch")
      RUN_MODE="--serverless=es"
      ;;
      "Serverless Observability")
      RUN_MODE="--serverless=oblt"
      ;;
      "Serverless Security")
      RUN_MODE="--serverless=security"
      ;;
      *)
      echo "Unknown run mode: $RUN_MODE_NAME"
      exit 1
      ;;
    esac

    echo "--- $TEST_NAME: '$SUITE_NAME' UI Tests"
    if ! node scripts/scout run-tests "$RUN_MODE" --config "$TEST_CONFIG" --kibana-install-dir "$KIBANA_DIR"; then
      echo "$TEST_NAME: failed"
      EXIT_CODE=1
    else
      echo "$TEST_NAME: passed"
    fi
  done
done

exit $EXIT_CODE
