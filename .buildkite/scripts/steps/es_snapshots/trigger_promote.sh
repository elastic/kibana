#!/bin/bash

set -euo pipefail

# If ES_SNAPSHOT_MANIFEST is set dynamically during the verify job, rather than provided during the trigger,
# such as if you provide it as input during a manual build,
# the ES_SNAPSHOT_MANIFEST env var will be empty in the context of the pipeline.
# So, we'll trigger with a script instead, so that we can ensure ES_SNAPSHOT_MANIFEST is populated.

export ES_SNAPSHOT_MANIFEST="${ES_SNAPSHOT_MANIFEST:-"$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST)"}"

if [[ "${BUILDKITE_BRANCH:-}" =~ ^(main|\d+\.\d+)$ ]] || [[ "${FORCE_PROMOTE:-}" =~ ^(1|true)$ ]]; then
  echo "Promoting snapshots on branch: ${BUILDKITE_BRANCH}"
else
  echo "ES Promotion is not allowed on feature branch ${BUILDKITE_BRANCH}"
  exit 0
fi

cat << EOF | buildkite-agent pipeline upload
steps:
  - trigger: 'kibana-elasticsearch-snapshot-promote'
    async: true
    build:
      env:
        ES_SNAPSHOT_MANIFEST: '$ES_SNAPSHOT_MANIFEST'
      branch: '$BUILDKITE_BRANCH'
EOF
