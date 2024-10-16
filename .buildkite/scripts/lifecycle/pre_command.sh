#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_job_env.sh

if [[ "${SKIP_NODE_SETUP:-}" =~ ^(1|true)$ ]]; then
  echo "Skipping node setup (SKIP_NODE_SETUP=$SKIP_NODE_SETUP)"
else
  source .buildkite/scripts/common/setup_node.sh
  source .buildkite/scripts/common/setup_buildkite_deps.sh

  echo '--- Agent Debug/SSH Info'
  ts-node .buildkite/scripts/lifecycle/print_agent_links.ts || true
fi

if [[ "$(curl -is metadata.google.internal || true)" ]]; then
  echo ""
  echo "To SSH into this agent, run:"
  echo "gcloud compute ssh --tunnel-through-iap --project elastic-kibana-ci --zone \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/zone)\" \"$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/name)\""
  echo ""
fi

if [[ "${BUILDKITE_LABEL:-}" == *"Run Dynamic Pipeline"* || "${BUILDKITE_LABEL:-}" == *"Upload Pipeline"* ]]; then
  cat << EOF | buildkite-agent annotate --context "ctx-gobld-metrics" --style "info"
<details>

<summary>Agent information from gobld</summary>
EOF
fi
