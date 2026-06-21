#!/usr/bin/env bash

set -euo pipefail

# Prepare KIBANA_TESTING_AI_CONNECTORS for suite_owner_notify triage summaries.

if [[ -z "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  echo "ERROR: KBN_EVALS_CONFIG_B64 is not set. Was setup_job_env.sh sourced?"
  exit 1
fi

source .buildkite/scripts/steps/evals/setup_connectors.sh
