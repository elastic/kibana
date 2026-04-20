#!/usr/bin/env bash

# Decide how Cypress suites should provision Elasticsearch based on whether an
# ES snapshot matching the current Kibana version has been promoted by
# release-eng.
#
# Motivation
# ----------
# Immediately after Kibana bumps to a new major/minor (e.g. 9.5.0, 9.6.0),
# there is a window where the unified release hasn't yet promoted the matching
# Elasticsearch snapshot. In that window, Cypress — which defaults to
# Docker-provisioned ES — would otherwise pull the previous ES Docker tag (or
# fail to pull entirely) and hit a Kibana/ES version mismatch like:
#
#   [elasticsearch-service] This version of Kibana (v9.5.0-SNAPSHOT) is
#   incompatible with the following Elasticsearch nodes in your cluster:
#   v9.4.0 ...
#
# Source of truth
# ---------------
# Both `elastic/kibana` and `elastic/elasticsearch` version-bump pipelines gate
# on the snapshot manifest published to GCS (see
# `.buildkite/pipelines/version_bump.yml` in both repos). Release-eng publishes
# a per-version JSON manifest at:
#
#   https://storage.googleapis.com/elastic-artifacts-snapshot/elasticsearch/latest/${VERSION}-SNAPSHOT.json
#
# which appears only after the snapshot for that exact version has been built
# and promoted. That is the same signal ES itself trusts to declare a version
# "ready", so we use it here too.
#
# Using the promoted snapshot manifest instead of a raw Docker registry HEAD
# has three advantages:
#   1. No registry auth dance (public GCS bucket, plain curl).
#   2. Promotion-level signal — an image may be pushed but not yet promoted;
#      the JSON appears only after promotion, avoiding a race where Cypress
#      pulls a half-ready snapshot.
#   3. Alignment — if ES release-eng considers a version "not ready", Kibana
#      Cypress should too, by construction.
#
# The check is intentionally best-effort: any probe failure (network, missing
# jq/curl, unexpected response) falls back to `snapshot` so tests keep running
# rather than silently using a mismatched Docker image.
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

_ES_SNAPSHOT_MANIFEST_HOST="https://storage.googleapis.com/elastic-artifacts-snapshot"
_ES_SNAPSHOT_PROJECT="elasticsearch"

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

_EXPECTED_VERSION="${_KIBANA_VERSION}-SNAPSHOT"
_ES_SNAPSHOT_MANIFEST_URL="${_ES_SNAPSHOT_MANIFEST_HOST}/${_ES_SNAPSHOT_PROJECT}/latest/${_EXPECTED_VERSION}.json"

echo "--- Probing ES snapshot manifest for ${_EXPECTED_VERSION}"
echo "detect_cypress_es_from: ${_ES_SNAPSHOT_MANIFEST_URL}"

_ES_SNAPSHOT_TMP="$(mktemp -t detect_cypress_es_from.XXXXXX 2>/dev/null || mktemp)"
_ES_SNAPSHOT_HTTP_STATUS="$(
  curl -sS -o "${_ES_SNAPSHOT_TMP}" -w '%{http_code}' \
    --max-time 20 --retry 2 --retry-delay 1 --retry-connrefused \
    "${_ES_SNAPSHOT_MANIFEST_URL}" 2>/dev/null || echo '000'
)"

case "${_ES_SNAPSHOT_HTTP_STATUS}" in
  200)
    _ES_PROMOTED_VERSION="$(jq -r '.version // empty' <"${_ES_SNAPSHOT_TMP}" 2>/dev/null || echo '')"
    if [[ "${_ES_PROMOTED_VERSION}" == "${_EXPECTED_VERSION}" ]]; then
      echo "detect_cypress_es_from: ES snapshot ${_EXPECTED_VERSION} is promoted — Cypress will use Docker"
      # Leave CYPRESS_ES_FROM unset; kbn-es + parallel.ts default to Docker.
    else
      _fallback_to_snapshot "snapshot manifest returned version '${_ES_PROMOTED_VERSION}', expected '${_EXPECTED_VERSION}'"
    fi
    ;;
  404)
    _fallback_to_snapshot "ES snapshot manifest for ${_EXPECTED_VERSION} is not yet published (HTTP 404)"
    ;;
  *)
    _fallback_to_snapshot "unexpected response fetching snapshot manifest (HTTP ${_ES_SNAPSHOT_HTTP_STATUS})"
    ;;
esac

rm -f "${_ES_SNAPSHOT_TMP}"

unset _ES_SNAPSHOT_MANIFEST_HOST _ES_SNAPSHOT_PROJECT _KIBANA_VERSION \
      _EXPECTED_VERSION _ES_SNAPSHOT_MANIFEST_URL _ES_SNAPSHOT_TMP \
      _ES_SNAPSHOT_HTTP_STATUS _ES_PROMOTED_VERSION
unset -f _fallback_to_snapshot
