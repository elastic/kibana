#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

GCS_BASE_URL="https://storage.googleapis.com"
ES_SNAPSHOTS_DAILY_BUCKET="kibana-ci-es-snapshots-daily"
SNAPSHOT_ID_PATTERN="[A-Za-z0-9_-]+"

if [[ "${KIBANA_GITHUB_BUILD_COMMIT_STATUS_ENABLED:-}" != "true" ]] && [[ "${ELASTIC_GITHUB_BUILD_COMMIT_STATUS_ENABLED:-}" != "true" ]]; then
  "$(dirname "${0}")/commit_status_start.sh"
fi


node "$(dirname "${0}")/ci_stats_start.ts"

# We resolve the latest manifest URL at the beginning of the build to ensure that all steps in the build will use the same manifest
# Otherwise, the manifest could change if a step is running around the time that a new one is promoted
if [[ ! "${ES_SNAPSHOT_MANIFEST:-}" ]]; then
  KIBANA_VERSION=$(cat package.json | jq -r .version)
  BUCKET=$(curl -s "$GCS_BASE_URL/$ES_SNAPSHOTS_DAILY_BUCKET/$KIBANA_VERSION/manifest-latest-verified.json" | jq -r .bucket)
  if [[ ! "$BUCKET" =~ ^"$ES_SNAPSHOTS_DAILY_BUCKET/$KIBANA_VERSION/archives/"$SNAPSHOT_ID_PATTERN$ ]]; then
    echo "Unexpected ES snapshot manifest bucket: $BUCKET"
    exit 1
  fi
  ES_SNAPSHOT_MANIFEST_DEFAULT="$GCS_BASE_URL/$BUCKET/manifest.json"
  buildkite-agent meta-data set ES_SNAPSHOT_MANIFEST_DEFAULT "$ES_SNAPSHOT_MANIFEST_DEFAULT"
fi

if [[ "${KIBANA_BUILD_ID:-}" && "${KIBANA_REUSABLE_BUILD_JOB_URL:-}" ]]; then
  cat << EOF | buildkite-agent annotate --style default --context kibana-reusable-build
  This build is using the Kibana distributable built from a different job, as the changes since this build do not seem to require a rebuild.

  See job here: $KIBANA_REUSABLE_BUILD_JOB_URL
EOF
fi

# Annotate ingestable meta-data (prefixed with 'ingest:')
if [[ "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-}" != "" ]]; then # if we're in a PR build
  # GITHUB_PR_DRAFT is set by our pr build trigger bot
  buildkite-agent meta-data set "ingest:is_draft_pr" "${GITHUB_PR_DRAFT:-false}"
  # GITHUB_PR_LABELS is set by our pr build trigger bot, and is a comma-separated list of labels on the PR
  if [[ "${GITHUB_PR_LABELS:-}" =~ [^[:space:]] ]]; then
    buildkite-agent meta-data set "ingest:pr_labels" "$GITHUB_PR_LABELS"
  fi
fi
