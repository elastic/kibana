#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
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

if [[ "${PR_CI_CANCELABLE_ON_GATE_FAILURE:-}" =~ ^(1|true)$ ]]; then
  buildkite-agent meta-data set "${BUILDKITE_JOB_ID}_pr_ci_cancelable" 'true' || \
    echo "Failed to mark ${BUILDKITE_JOB_ID} as pr-ci-cancelable" >&2
fi
