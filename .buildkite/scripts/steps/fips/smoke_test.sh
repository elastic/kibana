#!/usr/bin/env bash

set -euo pipefail

# Limit the FTR configs for now to avoid running all the tests. Once we're
# ready to utilize the full FTR suite in FIPS mode, we can remove this file and
# call pick_test_group_run_order.sh directly in .buildkite/pipelines/fips.yml.
configs=(
  "x-pack/test/reporting_functional/reporting_and_security.config.ts"
  "x-pack/test/saved_object_api_integration/security_and_spaces/config_trial.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group1/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group2/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group3/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group4/config.ts"
  "x-pack/test/functional/apps/saved_objects_management/config.ts"
  "x-pack/test/functional/apps/user_profiles/config.ts"
  "x-pack/test/functional/apps/security/config.ts"
)

printf -v FTR_CONFIG_PATTERNS '%s,' "${configs[@]}"
FTR_CONFIG_PATTERNS="${FTR_CONFIG_PATTERNS%,}"
export FTR_CONFIG_PATTERNS

.buildkite/scripts/steps/test/pick_test_group_run_order.sh
