#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

if [[ "${FTR_ENABLE_FIPS_AGENT:-}" == "true" ]]; then
  .buildkite/scripts/steps/checks/verify_fips_enabled.sh
fi
.buildkite/scripts/steps/checks/saved_objects.sh
.buildkite/scripts/steps/code_generation/elastic_assistant_codegen.sh
.buildkite/scripts/steps/code_generation/security_solution_codegen.sh
.buildkite/scripts/steps/code_generation/osquery_codegen.sh
