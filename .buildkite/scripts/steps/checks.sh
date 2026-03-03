#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

.buildkite/scripts/steps/checks/saved_objects_compat_changes.sh
.buildkite/scripts/steps/checks/saved_objects_definition_change.sh
.buildkite/scripts/steps/code_generation/elastic_assistant_codegen.sh
.buildkite/scripts/steps/code_generation/security_solution_codegen.sh
.buildkite/scripts/steps/code_generation/osquery_codegen.sh
.buildkite/scripts/steps/code_generation/cases_codegen.sh
