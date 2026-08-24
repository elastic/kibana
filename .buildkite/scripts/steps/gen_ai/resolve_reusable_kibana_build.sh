#!/usr/bin/env bash

# Resolve a recent Kibana distributable to reuse so gen-ai KB artifact pipelines
# (product-docs + Security Labs) can skip a ~16 minute `node scripts/build`.
#
# Must be sourced (so `export KIBANA_BUILD_ID` is visible to the caller):
#   source .buildkite/scripts/steps/gen_ai/resolve_reusable_kibana_build.sh
#   .buildkite/scripts/steps/build_kibana.sh
#
# Used by:
#   .buildkite/pipelines/gen_ai_product_docs.yml
#   .buildkite/pipelines/gen_ai_security_labs.yml
#
# Lookup is implemented in resolve_reusable_kibana_build.ts via BuildkiteClient
# (#pipeline-utils). Escape hatches: KIBANA_REUSE_BUILD=false; or set
# KIBANA_BUILD_ID to pin a specific Buildkite build UUID.

set -euo pipefail

if [[ "${KIBANA_REUSE_BUILD:-true}" =~ ^(0|false|no)$ ]]; then
  echo "--- KIBANA_REUSE_BUILD=${KIBANA_REUSE_BUILD}; will build Kibana from scratch"
  return 0 2>/dev/null || exit 0
fi

if [[ -n "${KIBANA_BUILD_ID:-}" ]]; then
  echo "--- KIBANA_BUILD_ID already set (${KIBANA_BUILD_ID}); skipping reuse lookup"
  return 0 2>/dev/null || exit 0
fi

if [[ -z "${BUILDKITE_TOKEN:-}" ]]; then
  echo "--- BUILDKITE_TOKEN unset; cannot look up a reusable build (will build Kibana)"
  return 0 2>/dev/null || exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Only depends on .buildkite/node_modules (ts-node, #pipeline-utils) — same as
# gate_failure/cancel.sh. No full repo bootstrap required.
TS_NODE=".buildkite/node_modules/.bin/ts-node"

if [[ ! -x "${TS_NODE}" ]]; then
  echo "--- ${TS_NODE} not found; cannot look up a reusable build (will build Kibana)"
  return 0 2>/dev/null || exit 0
fi

# Logs go to stderr from the TS script; stdout is only the build UUID on success.
# Failures soft-fall back to a fresh Kibana build.
reusable_id="$(
  "${TS_NODE}" "${SCRIPT_DIR}/resolve_reusable_kibana_build.ts" || true
)"
reusable_id="$(tr -d '[:space:]' <<<"${reusable_id}")"

if [[ -z "${reusable_id}" ]]; then
  return 0 2>/dev/null || exit 0
fi

export KIBANA_BUILD_ID="${reusable_id}"
