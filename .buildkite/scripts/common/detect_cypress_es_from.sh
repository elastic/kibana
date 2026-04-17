#!/usr/bin/env bash

# Decide how Cypress suites should provision Elasticsearch based on whether
# the `elasticsearch:${kibanaVersion}-SNAPSHOT` Docker image is published yet.
#
# Motivation
# ----------
# Immediately after Kibana bumps to a new major/minor (e.g. 9.5.0, 9.6.0),
# there is a window where the unified release hasn't yet published the matching
# Elasticsearch Docker image. In that window, Cypress would otherwise pull the
# previous ES Docker tag (or fail to pull entirely) and hit a Kibana/ES version
# mismatch like:
#
#   [elasticsearch-service] This version of Kibana (v9.5.0-SNAPSHOT) is
#   incompatible with the following Elasticsearch nodes in your cluster:
#   v9.4.0 ...
#
# This script probes the Elastic Docker registry for the image that matches the
# current Kibana version and, if it is not yet available, exports
# `CYPRESS_ES_FROM=snapshot` so Cypress falls back to the ES snapshot tar.gz
# (which is published much earlier in the release cycle).
#
# The check is intentionally best-effort: any probe failure (network, auth,
# unexpected response) falls back to `snapshot` so tests keep running rather
# than silently using a mismatched Docker image.
#
# Overrides
# ---------
# If `CYPRESS_ES_FROM` is already set (e.g. `snapshot`, `docker`, `serverless`),
# this script is a no-op and respects the explicit value.
#
# Usage
# -----
#   source .buildkite/scripts/common/detect_cypress_es_from.sh
#
# Intended to be sourced from `setup_job_env.sh`, but works standalone too.

set -euo pipefail

if [[ -n "${CYPRESS_ES_FROM:-}" ]]; then
  echo "detect_cypress_es_from: CYPRESS_ES_FROM is already set to '${CYPRESS_ES_FROM}', leaving as-is"
  return 0 2>/dev/null || exit 0
fi

_ES_REGISTRY="https://docker.elastic.co"
_ES_AUTH_ENDPOINT="https://docker-auth.elastic.co/auth"
_ES_IMAGE_REPO="elasticsearch/elasticsearch"

# Safe fallback that also signals why it triggered.
_fallback_to_snapshot() {
  local reason="${1:-unknown}"
  echo "detect_cypress_es_from: falling back to CYPRESS_ES_FROM=snapshot (${reason})"
  export CYPRESS_ES_FROM=snapshot
}

if ! command -v jq >/dev/null 2>&1; then
  _fallback_to_snapshot "jq not found"
  return 0 2>/dev/null || exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  _fallback_to_snapshot "curl not found"
  return 0 2>/dev/null || exit 0
fi

_KIBANA_VERSION="$(jq -r '.version' package.json 2>/dev/null || echo '')"
if [[ -z "${_KIBANA_VERSION}" || "${_KIBANA_VERSION}" == "null" ]]; then
  _fallback_to_snapshot "could not read .version from package.json"
  return 0 2>/dev/null || exit 0
fi

_ES_IMAGE_TAG="${_KIBANA_VERSION}-SNAPSHOT"
_ES_MANIFEST_URL="${_ES_REGISTRY}/v2/${_ES_IMAGE_REPO}/manifests/${_ES_IMAGE_TAG}"
_ES_MANIFEST_ACCEPT_HEADERS=(
  -H 'Accept: application/vnd.docker.distribution.manifest.v2+json'
  -H 'Accept: application/vnd.oci.image.manifest.v1+json'
  -H 'Accept: application/vnd.docker.distribution.manifest.list.v2+json'
  -H 'Accept: application/vnd.oci.image.index.v1+json'
)

echo "--- Probing ES Docker image availability: ${_ES_IMAGE_REPO}:${_ES_IMAGE_TAG}"

# docker.elastic.co always requires a bearer token, even for public repos.
# Mint an anonymous pull-scoped token via the standard Docker Registry v2 flow.
_ES_TOKEN_RESPONSE="$(
  curl -sS --max-time 20 \
    "${_ES_AUTH_ENDPOINT}?service=token-service&scope=repository:${_ES_IMAGE_REPO}:pull" 2>/dev/null || echo ''
)"

if [[ -z "${_ES_TOKEN_RESPONSE}" ]]; then
  _fallback_to_snapshot "auth endpoint returned empty response"
  return 0 2>/dev/null || exit 0
fi

_ES_TOKEN="$(jq -r '.access_token // .token // empty' <<<"${_ES_TOKEN_RESPONSE}" 2>/dev/null || echo '')"
if [[ -z "${_ES_TOKEN}" ]]; then
  _fallback_to_snapshot "auth endpoint returned no token"
  return 0 2>/dev/null || exit 0
fi

_ES_IMAGE_HTTP_STATUS="$(
  curl -sS -o /dev/null -w '%{http_code}' --max-time 20 \
    -H "Authorization: Bearer ${_ES_TOKEN}" \
    "${_ES_MANIFEST_ACCEPT_HEADERS[@]}" \
    "${_ES_MANIFEST_URL}" 2>/dev/null || echo '000'
)"

case "${_ES_IMAGE_HTTP_STATUS}" in
  200)
    echo "detect_cypress_es_from: ${_ES_IMAGE_REPO}:${_ES_IMAGE_TAG} is available — Cypress will use Docker"
    # Leave CYPRESS_ES_FROM unset; kbn-es + parallel.ts default to Docker.
    ;;
  404)
    echo "detect_cypress_es_from: ${_ES_IMAGE_REPO}:${_ES_IMAGE_TAG} is NOT published yet (HTTP 404)"
    _fallback_to_snapshot "ES Docker image for this Kibana version is not yet published"
    ;;
  *)
    _fallback_to_snapshot "unexpected registry response HTTP ${_ES_IMAGE_HTTP_STATUS}"
    ;;
esac

unset _ES_REGISTRY _ES_AUTH_ENDPOINT _ES_IMAGE_REPO _KIBANA_VERSION _ES_IMAGE_TAG \
      _ES_MANIFEST_URL _ES_MANIFEST_ACCEPT_HEADERS \
      _ES_TOKEN_RESPONSE _ES_TOKEN _ES_IMAGE_HTTP_STATUS
unset -f _fallback_to_snapshot
