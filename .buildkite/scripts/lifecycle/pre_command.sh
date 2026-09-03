#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh

# TEMPORARY — Citadel proxy investigation, platform-engineering-productivity#3163.
# Remove along with citadel_proxy_experiment.sh before merge.
# Must come after env.sh (needs BUILDKITE_AGENT_GCP_REGION) but BEFORE
# setup_job_env.sh, which authenticates to Vault at secrets.elastic.co:8200 —
# anything sourced after that point cannot influence the proxy for that call.
source .buildkite/scripts/lifecycle/citadel_proxy_experiment.sh

source .buildkite/scripts/common/setup_job_env.sh
source .buildkite/scripts/common/setup_executors.sh

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
