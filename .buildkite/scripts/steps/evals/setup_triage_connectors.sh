#!/usr/bin/env bash

set -euo pipefail

# Prepare KIBANA_TESTING_AI_CONNECTORS for suite_owner_notify judge triage.
#
# Triage always uses a LiteLLM judge: the suite_owner_notify step has no ES
# cluster with EIS inference privileges, so EIS judges cannot be called directly
# here. We therefore only need LiteLLM connectors available for triage.
#
# NOTE: This file is `source`d by suite_owner_notify.sh, so it must not call
# `exit` on the non-fatal paths (that would terminate the parent step).

if [[ -z "${KBN_EVALS_CONFIG_B64:-}" ]]; then
  echo "ERROR: KBN_EVALS_CONFIG_B64 is not set. Was setup_job_env.sh sourced?"
  exit 1
fi

export KBN_EVALS_SUITE_OWNER_NOTIFY=1

# Generates KIBANA_TESTING_AI_CONNECTORS with the team's LiteLLM connectors
# (NEED_LITELLM_CONNECTORS is forced on when KBN_EVALS_SUITE_OWNER_NOTIFY=1).
source .buildkite/scripts/steps/evals/setup_connectors.sh
