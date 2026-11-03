#!/usr/bin/env bash

set -euo pipefail

SOURCE_SHA="$(git rev-parse HEAD)"
PR_NUMBER="${BUILDKITE_PULL_REQUEST:?Missing Buildkite PR number}"
BUILD_ID="${BUILDKITE_BUILD_ID:?Missing Buildkite build ID}"
JOB_ID="${BUILDKITE_JOB_ID:?Missing Buildkite job ID}"

if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ || ! "$SOURCE_SHA" =~ ^[a-f0-9]{40}$ ||
      ! "$BUILD_ID" =~ ^[a-zA-Z0-9-]+$ || ! "$JOB_ID" =~ ^[a-zA-Z0-9-]+$ ]]; then
  echo 'Invalid Studio artifact identity' >&2
  exit 1
fi

if [[ ! -f target/isomer-studio/index.html || ! -f target/isomer-studio/build.json ]]; then
  echo 'Missing Studio site or build metadata' >&2
  exit 1
fi

# Job-scoped paths keep concurrent builds and retries from replacing another checkout's preview.
STUDIO_PATH="isomer-studio/pr-$PR_NUMBER/$SOURCE_SHA/$BUILD_ID/$JOB_ID"
STUDIO_URL="https://ci-artifacts.kibana.dev/$STUDIO_PATH/"

echo '--- Publish shared Isomer Studio preview'
bash .buildkite/scripts/common/activate_service_account.sh gs://ci-artifacts.kibana.dev
(
  cd target/isomer-studio
  gcloud storage cp \
    --cache-control="no-cache, max-age=0, no-transform" \
    --gzip-local=js,css,html,json,map,txt,svg \
    --recursive --no-user-output-enabled \
    '*' "gs://ci-artifacts.kibana.dev/$STUDIO_PATH/"
)

buildkite-agent meta-data set pr_comment:isomer_studio:head "* [Isomer Studio Preview]($STUDIO_URL)"
printf 'Studio: %s\nCheckout: `%s`\n' "$STUDIO_URL" "$SOURCE_SHA" \
  | buildkite-agent annotate --style info --context isomer-studio
