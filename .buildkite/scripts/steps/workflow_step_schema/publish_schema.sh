#!/usr/bin/env bash
#
# Publishes the committed workflow step-schema artifact to the workflows CDN.
#
# Usage: publish_schema.sh <release|serverless>
#
# The workflows-owned bucket (elastic-workflows-library-prod, served at
# https://workflows.elastic.co) hosts public schemas under a `/schema/v1`
# object-key prefix, a sibling of the `/library` prefix used by the Workflow
# Template Library (see elastic/workflows#19).
#
#   release    -> schema/v1/<BASE_VERSION>/release   (RCs + GA overwrite in place)
#   serverless -> schema/v1/serverless               (rolling)
#
# Version/build context is read from the environment (exported by the artifacts
# env.sh) with package.json fallbacks, so the script is safe to call from either
# the release (DRA) or serverless (image promotion) pipeline.

set -euo pipefail

source .buildkite/scripts/common/util.sh

CHANNEL="${1:-}"

BUCKET="elastic-workflows-library-prod"
CDN_HOST="https://workflows.elastic.co"
GENERATED_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"
VAULT_SECRET_PATH="kv/ci-shared/workflows-library/gcs-publish"
VAULT_FIELD="credentials"

BASE_VERSION="${BASE_VERSION:-$(jq -r '.version' package.json)}"
FULL_VERSION="${FULL_VERSION:-$BASE_VERSION}"
BUILD_HASH="${BUILDKITE_COMMIT:-unknown}"

case "$CHANNEL" in
  release)
    DEST="schema/v1/${BASE_VERSION}/release"
    STAMP_VERSION="$FULL_VERSION"
    ;;
  serverless)
    DEST="schema/v1/serverless"
    STAMP_VERSION="$BASE_VERSION"
    ;;
  *)
    echo "Usage: publish_schema.sh <release|serverless>" >&2
    exit 1
    ;;
esac

SRC="${GENERATED_DIR}/${CHANNEL}"
if [[ ! -f "$SRC/index.json" ]]; then
  echo "Missing committed schema artifact at ${SRC}/index.json" >&2
  exit 1
fi

echo "--- Fetch GCS publisher credentials from Vault"
# KV v2 secret; `vault kv get` resolves the data path. Retry per CI guidance.
GCS_SA_KEY="$(retry 5 5 vault kv get -field="$VAULT_FIELD" "$VAULT_SECRET_PATH")"
if [[ -z "$GCS_SA_KEY" ]]; then
  echo "Vault returned empty GCS credentials (${VAULT_SECRET_PATH}, field ${VAULT_FIELD})" >&2
  exit 1
fi

echo "--- Stage artifact (stamp kibanaVersion + buildHash)"
# The committed copy carries a deterministic placeholder buildHash; stamp the
# real build context onto the published copy only. The schema.json bytes are
# untouched, so the variant sha256 entries in index.json stay valid.
STAGE="$(mktemp -d)"
set +x  # defensive: never trace the service-account key
trap 'rm -rf "$STAGE"; gcloud auth revoke --all 2>/dev/null || true' EXIT
cp -r "$SRC/." "$STAGE/"
jq --arg v "$STAMP_VERSION" --arg h "$BUILD_HASH" \
  '.kibanaVersion = $v | .buildHash = $h' "$SRC/index.json" > "$STAGE/index.json"

echo "--- Authenticate to GCP"
gcloud auth activate-service-account --key-file <(echo "$GCS_SA_KEY")

echo "--- Publish ${SRC} -> gs://${BUCKET}/${DEST}"
# `gcloud storage rsync` is the recommended CLI (gsutil rsync is deprecated).
# --delete-unmatched-destination-objects prunes files removed from the artifact;
# it is scoped to the destination prefix, so sibling prefixes are untouched.
# Short TTL: schema URLs are stable but republishable, so not immutable.
gcloud storage rsync "$STAGE" "gs://${BUCKET}/${DEST}" \
  --recursive \
  --delete-unmatched-destination-objects \
  --cache-control="public, max-age=300"

echo "--- Published ${CDN_HOST}/${DEST}/"
