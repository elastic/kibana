#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh

if [[ "${FTR_ENABLE_FIPS_AGENT:-}" == "true" ]]; then
  .buildkite/scripts/steps/checks/verify_fips_enabled.sh
fi
.buildkite/scripts/steps/checks/saved_objects_compat_changes.sh
.buildkite/scripts/steps/checks/saved_objects_definition_change.sh
.buildkite/scripts/steps/capture_oas_snapshot.sh
.buildkite/scripts/steps/code_generation/elastic_assistant_codegen.sh
.buildkite/scripts/steps/code_generation/security_solution_codegen.sh
.buildkite/scripts/steps/openapi_bundling/security_solution_openapi_bundling.sh
.buildkite/scripts/steps/code_generation/osquery_codegen.sh
.buildkite/scripts/steps/openapi_bundling/final_merge.sh
.buildkite/scripts/steps/openapi_bundling/final_merge_staging.sh
