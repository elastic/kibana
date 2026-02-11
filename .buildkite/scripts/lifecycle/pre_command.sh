#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_job_env.sh
source .buildkite/scripts/common/setup_executors.sh

# Cancel this step early if a check gate has already failed and this step
# is registered for cancel-on-gate-failure. The step cancel API call tells
# Buildkite to cancel the job; the agent will SIGTERM the process shortly after.
exit_current_step_if_gate_failed || true

if [[ "${SKIP_NODE_SETUP:-}" =~ ^(1|true)$ ]]; then
  echo "Skipping node setup (SKIP_NODE_SETUP=$SKIP_NODE_SETUP)"
else
  source .buildkite/scripts/common/setup_node.sh
  source .buildkite/scripts/common/setup_buildkite_deps.sh
fi

if [[ "${BUILDKITE_LABEL:-}" == *"Run Dynamic Pipeline"* || "${BUILDKITE_LABEL:-}" == *"Upload Pipeline"* ]]; then
  cat << EOF | buildkite-agent annotate --context "ctx-gobld-metrics" --style "info"
<details>

<summary>Agent information from gobld</summary>
EOF
fi
