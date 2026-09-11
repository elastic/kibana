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
# The committed artifact is channel-agnostic (no `channel` key in index.json).
# This script stamps `kibanaVersion`, `buildHash`, and `channel` onto the
# published copy; the schema.json bytes are untouched, so the sha256 entries
# in index.json remain valid.
#
# Version/build context is read from the environment (exported by the artifacts
# env.sh) with package.json fallbacks, so the script is safe to call from either
# the release (DRA) or serverless (image promotion) pipeline.
#
# Prerequisites (confirmed with @elastic/kibana-operations):
#   - GCS_SA_CDN_KEY, GCS_SA_CDN_EMAIL, GCS_SA_CDN_BUCKET must be exported by
#     setup_job_env.sh before this script runs. The pattern mirrors docker_image.sh.
#   - The workflows-cdn service account must have write access to
#     elastic-workflows-library-prod (separate from the main CDN bucket).

set -euo pipefail

source .buildkite/scripts/common/util.sh

CHANNEL="${1:-}"

# Emit a Buildkite warning annotation if this script exits non-zero in CI,
# so a soft-failed CDN publish is visible on the build page without trawling
# step logs. No-ops outside CI (when BUILDKITE_AGENT_ACCESS_TOKEN is unset).
_annotate_on_failure() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && -n "${BUILDKITE_AGENT_ACCESS_TOKEN:-}" ]]; then
    buildkite-agent annotate \
      "**Workflow step schema CDN publish (${CHANNEL:-unknown} channel) failed** with exit code ${exit_code}. The schema at https://workflows.elastic.co may be stale. Check the job log for details." \
      --style warning --context workflow-schema-cdn 2>/dev/null || true
  fi
}
trap _annotate_on_failure EXIT

CDN_HOST="https://workflows.elastic.co"
GENERATED_DIR="src/platform/packages/private/kbn-workflow-step-schema-cli/generated"

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

SRC="$GENERATED_DIR"
if [[ ! -f "$SRC/index.json" ]]; then
  echo "Missing committed schema artifact at ${SRC}/index.json" >&2
  exit 1
fi

# --- Pre-flight: verify every variant file exists and its sha256 matches the
# manifest before touching GCS. Aborts before any cloud write on mismatch,
# making --delete-unmatched-destination-objects safe.
echo "--- Verifying artifact integrity (sha256 pre-flight)"
while IFS=$'\t' read -r rel sha; do
  if [[ ! -f "$SRC/$rel" ]]; then
    echo "Missing schema variant: ${SRC}/${rel}" >&2
    exit 1
  fi
  actual="$(sha256sum "$SRC/$rel" | cut -d' ' -f1)"
  if [[ "$actual" != "$sha" ]]; then
    echo "Checksum mismatch for ${rel}: expected ${sha}, got ${actual}" >&2
    exit 1
  fi
  echo "  ${rel}: OK"
done < <(jq -r '.variants[] | [.path, .sha256] | @tsv' "$SRC/index.json")

echo "--- Stage artifact (stamp kibanaVersion, buildHash, channel)"
STAGE="$(mktemp -d)"
# Narrow the revoke to the service account we activate, not every account on the machine.
trap 'rm -rf "$STAGE"; gcloud auth revoke "${GCS_SA_CDN_EMAIL:-}" 2>/dev/null || true' EXIT
cp -r "$SRC/." "$STAGE/"
# `jq -S` sorts keys to preserve the key-sorted invariant of the published bytes.
jq -S --arg v "$STAMP_VERSION" --arg h "$BUILD_HASH" --arg c "$CHANNEL" \
  '.kibanaVersion = $v | .buildHash = $h | .channel = $c' "$SRC/index.json" > "$STAGE/index.json"

echo "--- Authenticate to GCP"
# GCS_SA_CDN_KEY and GCS_SA_CDN_EMAIL are exported by setup_job_env.sh.
gcloud auth activate-service-account --key-file <(echo "$GCS_SA_CDN_KEY")

echo "--- Publish ${SRC} -> gs://${GCS_SA_CDN_BUCKET:-elastic-workflows-library-prod}/${DEST}"
# `gcloud storage rsync` is the recommended CLI (gsutil rsync is deprecated).
# --delete-unmatched-destination-objects prunes files removed from the artifact;
# it is scoped to the destination prefix, so sibling prefixes are untouched.
# Short TTL: schema URLs are stable but republishable, so not immutable.
gcloud storage rsync "$STAGE" "gs://${GCS_SA_CDN_BUCKET:-elastic-workflows-library-prod}/${DEST}" \
  --recursive \
  --delete-unmatched-destination-objects \
  --cache-control="public, max-age=300"

echo "--- Published ${CDN_HOST}/${DEST}/"
