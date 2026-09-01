#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/steps/artifacts/env.sh

print_if_dry_run

if [[ "$BUILDKITE_BRANCH" == "$KIBANA_BASE_BRANCH" ]] || [[ "${DRY_RUN:-}" =~ ^(1|true)$ ]]; then
  echo "--- :beats: Downloading beats manifest"
  download_artifact beats_manifest.json /tmp --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  BEATS_MANIFEST_URL="$(jq -r .manifest_url /tmp/beats_manifest.json)"

  echo "--- :pipeline: Uploading DRA pipeline"
  cat << EOF | buildkite-agent pipeline upload
steps:
  - label: ":package: DRA Prep"
    key: dra-prep
    command: ".buildkite/scripts/steps/artifacts/stage_artifacts.sh"
    agents:
      image: family/kibana-ubuntu-2404
      imageProject: elastic-images-prod
      provider: gcp
      machineType: n2-standard-2
      diskSizeGb: 180
    timeout_in_minutes: 30
    plugins:
      - elastic/dra-prep#v0.1.6:
          product_id: kibana
          stack_version: "${QUALIFIER_VERSION}"
          workflow: "${WORKFLOW}"
          dependencies:
            - "beats:${BEATS_MANIFEST_URL}"

  - label: ":pipeline: Trigger DRA processing for kibana"
    trigger: "unified-release-dra-processing"
    async: true
    depends_on: "dra-prep"
    if: 'build.env("DRY_RUN") != "true" && build.env("DRY_RUN") != "1"'
    build:
      env:
        DRA_PRODUCT_ID: kibana
        DRA_STACK_VERSION: "${QUALIFIER_VERSION}"
        DRA_WORKFLOW: "${WORKFLOW}"
EOF
else
  echo "Skipping DRA publishing for untracked branch $BUILDKITE_BRANCH"
fi
