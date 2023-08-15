#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB="kibana-serverless-$SERVERLESS_ENVIRONMENT"

if [[ "$SERVERLESS_ENVIRONMENT" == "search" ]]; then
  SERVERLESS_CONFIGS=(
    "x-pack/test_serverless/api_integration/test_suites/search/config.ts"
    "x-pack/test_serverless/api_integration/test_suites/search/config.feature_flags.ts"
    "x-pack/test_serverless/functional/test_suites/search/config.ts"
  )
elif [[ "$SERVERLESS_ENVIRONMENT" == "observability" ]]; then
  SERVERLESS_CONFIGS=(
    "x-pack/test_serverless/api_integration/test_suites/observability/config.ts"
    "x-pack/test_serverless/api_integration/test_suites/observability/config.feature_flags.ts"
    "x-pack/test_serverless/functional/test_suites/observability/config.ts"
    "x-pack/test_serverless/functional/test_suites/observability/cypress/config_headless.ts"
  )
elif [[ "$SERVERLESS_ENVIRONMENT" == "security" ]]; then
  SERVERLESS_CONFIGS=(
    "x-pack/test_serverless/api_integration/test_suites/security/config.ts"
    "x-pack/test_serverless/api_integration/test_suites/security/config.feature_flags.ts"
    "x-pack/test_serverless/functional/test_suites/security/config.ts"
  )
fi

EXIT_CODE=0

for CONFIG in "${SERVERLESS_CONFIGS[@]}"
do
  echo "--- $ node scripts/functional_tests --bail --config $CONFIG"
  set +e;
  node ./scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$CONFIG"
  LAST_CODE=$?
  set -e;

  if [ $LAST_CODE -ne 0 ]; then
    EXIT_CODE=10
  fi
done

exit $EXIT_CODE
