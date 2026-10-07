#!/usr/bin/env bash
#
# Manually republishes the committed workflow step schema of the commit this build
# runs on (e.g. the merge commit of a sync PR) to a CDN channel. It does not boot
# Kibana: it publishes the `generated/` directory of the checked-out commit.
#
# Trigger it with the commit to publish from, for example:
#   node .buildkite/scripts/steps/trigger_pipeline.ts kibana-workflow-step-schema-republish 9.5 <commit> "" \
#     "CHANNEL=release BASE_VERSION=9.5.0 FULL_VERSION=9.5.0-rc1"
#
# Environment:
#   CHANNEL        release | serverless (required)
#   BASE_VERSION   required for release, e.g. 9.5.0 (selects schema/v1/<BASE_VERSION>/release)
#   FULL_VERSION   optional for release, stamped as kibanaVersion (defaults to BASE_VERSION)
#   DRY_RUN        true to verify and stage without uploading

set -euo pipefail

CHANNEL="${CHANNEL:-}"

case "$CHANNEL" in
  release)
    if [[ -z "${BASE_VERSION:-}" ]]; then
      echo "BASE_VERSION is required for the release channel (the checked-out commit's package.json version may not be the release you mean)." >&2
      exit 1
    fi
    export BASE_VERSION
    export FULL_VERSION="${FULL_VERSION:-$BASE_VERSION}"
    ;;
  serverless) ;;
  *)
    echo "CHANNEL must be 'release' or 'serverless' (got '${CHANNEL}')." >&2
    exit 1
    ;;
esac

echo "--- Republishing the workflow step schema of ${BUILDKITE_COMMIT:-HEAD} to the ${CHANNEL} channel"
.buildkite/scripts/steps/workflow_step_schema/publish_schema.sh "$CHANNEL"

buildkite-agent annotate \
  "Republished the workflow step schema of \`${BUILDKITE_COMMIT:-HEAD}\` to the ${CHANNEL} channel${BASE_VERSION:+ (${BASE_VERSION})}." \
  --style success --context workflow-schema-republish || true
