#!/bin/bash

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELEASE_BRANCHES="$(jq -r '.versions[].branch' "$REPO_ROOT/versions.json" | tr '\n' ' ')"

is_release_branch() {
  for branch in $RELEASE_BRANCHES; do
    if [[ "$BUILDKITE_BRANCH" == "$branch" ]]; then
      return 0
    fi
  done
  return 1
}

if [[ "${FORCE_PROMOTE:-}" == "true" ]]; then
  echo "--- FORCE_PROMOTE is set, triggering promotion from branch '$BUILDKITE_BRANCH'"
elif is_release_branch; then
  echo "--- Branch '$BUILDKITE_BRANCH' is a release branch, triggering promotion"
else
  echo "--- Skipping promotion: branch '$BUILDKITE_BRANCH' is not a release branch ($RELEASE_BRANCHES)"
  echo "Set FORCE_PROMOTE=true to override"
  exit 0
fi

# If ES_SNAPSHOT_MANIFEST is set dynamically during the verify job, rather than provided during the trigger,
# such as if you provide it as input during a manual build,
# the ES_SNAPSHOT_MANIFEST env var will be empty in the context of the pipeline.
# So, we'll trigger with a script instead, so that we can ensure ES_SNAPSHOT_MANIFEST is populated.

export ES_SNAPSHOT_MANIFEST="${ES_SNAPSHOT_MANIFEST:-"$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST)"}"

cat << EOF | buildkite-agent pipeline upload
steps:
  - trigger: 'kibana-elasticsearch-snapshot-promote'
    async: true
    build:
      env:
        ES_SNAPSHOT_MANIFEST: '$ES_SNAPSHOT_MANIFEST'
      branch: '$BUILDKITE_BRANCH'
EOF
