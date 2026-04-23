#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"

BUILD_API_DOCS_FLAGS=""
if [[ "${SKIP_DEPRECATED_REFS:-}" == "true" ]]; then
  echo "Skipping deprecated/adoption reference collection (PR build)"
  BUILD_API_DOCS_FLAGS="--skipDeprecatedRefs"
fi

node --max-old-space-size=24000 scripts/build_api_docs $BUILD_API_DOCS_FLAGS

if [[ "${PUBLISH_API_DOCS_CHANGES:-}" == "true" ]]; then
  echo "--- Store API Docs changes in Buildkite"
  git add -N ./*.docnav.json
  git add -N api_docs
  git diff > api_docs_changes.diff
  buildkite-agent artifact upload api_docs_changes.diff

  echo "API Docs changes uploaded"
fi

if [[ "${SKIP_DEPRECATED_REFS:-}" == "true" ]]; then
  echo "--- Checking for API doc changes"
  git add -N ./*.docnav.json
  git add -N api_docs
  if ! git diff --quiet api_docs ./*.docnav.json 2>/dev/null; then
    echo "API docs changed — uploading non-blocking full metrics step"
    buildkite-agent pipeline upload <<'YAML'
steps:
  - command: .buildkite/scripts/steps/api_docs/build_api_docs.sh
    label: 'Build API Docs (full metrics)'
    soft_fail: true
    agents:
      machineType: c4d-highmem-4
      diskType: hyperdisk-balanced
      preemptible: true
      spotZones: us-central1-a,us-central1-b,us-central1-c
      diskSizeGb: 105
    timeout_in_minutes: 60
    retry:
      automatic:
        - exit_status: '-1'
          limit: 3
YAML
  else
    echo "No API doc changes detected — skipping full metrics step"
  fi
fi
