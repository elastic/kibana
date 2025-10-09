#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

if [[ "${GITHUB_BUILD_COMMIT_STATUS_ENABLED:-}" != "true" ]] && [[ "${ELASTIC_GITHUB_BUILD_COMMIT_STATUS_ENABLED:-}" != "true" ]]; then
  "$(dirname "${0}")/commit_status_start.sh"
fi


ts-node "$(dirname "${0}")/ci_stats_start.ts"

# We resolve the latest manifest URL at the beginning of the build to ensure that all steps in the build will use the same manifest
# Otherwise, the manifest could change if a step is running around the time that a new one is promoted
if [[ ! "${ES_SNAPSHOT_MANIFEST:-}" ]]; then
  BUCKET=$(curl -s "https://storage.googleapis.com/kibana-ci-es-snapshots-daily/$(cat package.json | jq -r .version)/manifest-latest-verified.json" | jq -r .bucket)
  ES_SNAPSHOT_MANIFEST_DEFAULT="https://storage.googleapis.com/$BUCKET/manifest.json"
  buildkite-agent meta-data set ES_SNAPSHOT_MANIFEST_DEFAULT "$ES_SNAPSHOT_MANIFEST_DEFAULT"
fi

if [[ "${KIBANA_BUILD_ID:-}" && "${KIBANA_REUSABLE_BUILD_JOB_URL:-}" ]]; then
  cat << EOF | buildkite-agent annotate --style default --context kibana-reusable-build
  This build is using the Kibana distributable built from a different job, as the changes since this build do not seem to require a rebuild.

  See job here: $KIBANA_REUSABLE_BUILD_JOB_URL
EOF
fi

# Bootstrap and archive moon cache to avoid remote cache accesses in every step
buildkite-agent step update outcome passed || echo "Can't set step to passed, maybe it's already passed?"
buildkite-agent step update state finished || echo "Can't set step to finished, maybe it's already finished?"
export MOON_CACHE=write
.buildkite/scripts/bootstrap.sh
echo "--- Archive moon cache"
if [[ ! -d .moon/cache ]]; then
  echo "No moon cache directory found, skipping archive"
  exit 0
else
  tar -czf ~/moon-cache.tar.gz .moon/cache || echo "Failed to archive moon cache"
  cd ~/
  buildkite-agent artifact upload moon-cache.tar.gz || echo "Failed to upload moon cache"
  echo "Moon cache archived as moon-cache.tar.gz"
fi
