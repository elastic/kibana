#!/usr/bin/env bash
# Publishes the connector execution manifest from the deployed git SHA after the
# final Production-NonCanary slice. Older builds cannot overwrite a manifest
# from a newer deployment unless an explicit rollback override is supplied.

set -euo pipefail

MANIFEST_PATH='src/platform/packages/shared/kbn-connector-specs/connector_execution_manifest.json'
TARGET_BRANCH='connector-production-manifest'
REPO='elastic/kibana'
API_BASE="${GITHUB_API_BASE:-https://api.github.com/repos/${REPO}}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN with contents:write permission is required" >&2
  exit 1
fi

if [[ ! "${SERVICE_VERSION:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "SERVICE_VERSION must be the 40-character deployed git SHA" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

github_request() {
  local method="$1"
  local accept="$2"
  local url="$3"
  local output="$4"
  local data="${5:-}"
  local args=(
    -sS
    -o "${output}"
    -w '%{http_code}'
    -X "${method}"
    -H "Accept: ${accept}"
    -H "Authorization: Bearer ${GITHUB_TOKEN}"
    -H 'X-GitHub-Api-Version: 2022-11-28'
  )
  if [[ -n "${data}" ]]; then
    args+=(-d "${data}")
  fi
  curl "${args[@]}" "${url}" || true
}

echo "--- Publishing connector manifest from ${SERVICE_VERSION} to ${TARGET_BRANCH}"

source_response="${tmp_dir}/source_manifest"
source_status="$(
  github_request \
    GET \
    'application/vnd.github.raw+json' \
    "${API_BASE}/contents/${MANIFEST_PATH}?ref=${SERVICE_VERSION}" \
    "${source_response}"
)"
if [[ "${source_status}" != '200' ]]; then
  echo "Failed to fetch manifest at ${SERVICE_VERSION}. GitHub API returned ${source_status}:" >&2
  cat "${source_response}" >&2
  exit 1
fi

build_url="${BUILDKITE_BUILD_URL:-unknown}"
if ! published_content="$(
  DEPLOYED_COMMIT="${SERVICE_VERSION}" BUILD_URL="${build_url}" python3 -c '
import json
import os
import re
import sys

manifest = json.load(sys.stdin)
assert manifest.get("schemaVersion") == "1", "schemaVersion must be 1"
connectors = manifest.get("connectors")
assert isinstance(connectors, list), "connectors must be a list"
seen = set()
fingerprint = re.compile(r"^[0-9a-f]{64}$")
for connector in connectors:
    assert isinstance(connector, dict), "connector entries must be objects"
    connector_id = connector.get("id")
    assert isinstance(connector_id, str) and connector_id, "connector has invalid id"
    assert connector_id not in seen, f"duplicate connector id: {connector_id}"
    seen.add(connector_id)
    features = connector.get("supportedFeatureIds")
    assert isinstance(features, list), f"{connector_id}: supportedFeatureIds must be a list"
    assert all(isinstance(value, str) for value in features), (
        f"{connector_id}: supportedFeatureIds entries must be strings"
    )
    assert fingerprint.fullmatch(connector.get("executionFingerprint", "")), (
        f"{connector_id}: invalid executionFingerprint"
    )

manifest["deployedCommit"] = os.environ["DEPLOYED_COMMIT"]
manifest["buildUrl"] = os.environ["BUILD_URL"]
json.dump(manifest, sys.stdout, separators=(",", ":"))
' < "${source_response}"
)"; then
  echo "Fetched manifest is invalid; aborting" >&2
  exit 1
fi

encoded="$(
  printf '%s' "${published_content}" |
    python3 -c 'import base64, sys; print(base64.b64encode(sys.stdin.buffer.read()).decode())'
)"
commit_message="chore: publish connector manifest for ${SERVICE_VERSION}

Deployed commit: ${SERVICE_VERSION}
Buildkite build: ${build_url}"

branch_response="${tmp_dir}/branch"
branch_status="$(
  github_request \
    GET \
    'application/vnd.github+json' \
    "${API_BASE}/git/ref/heads/${TARGET_BRANCH}" \
    "${branch_response}"
)"
if [[ "${branch_status}" == '404' ]]; then
  create_response="${tmp_dir}/create_ref"
  create_payload="$(
    REF="refs/heads/${TARGET_BRANCH}" SHA="${SERVICE_VERSION}" python3 -c '
import json
import os
print(json.dumps({"ref": os.environ["REF"], "sha": os.environ["SHA"]}))
'
  )"
  create_status="$(
    github_request \
      POST \
      'application/vnd.github+json' \
      "${API_BASE}/git/refs" \
      "${create_response}" \
      "${create_payload}"
  )"
  if [[ "${create_status}" != '201' && "${create_status}" != '422' ]]; then
    echo "Failed to create branch ${TARGET_BRANCH}. GitHub API returned ${create_status}:" >&2
    cat "${create_response}" >&2
    exit 1
  fi
elif [[ "${branch_status}" != '200' ]]; then
  echo "Failed to read branch ${TARGET_BRANCH}. GitHub API returned ${branch_status}:" >&2
  cat "${branch_response}" >&2
  exit 1
fi

current_file_sha=''
current_deployed_commit=''
load_current_manifest() {
  local response="${tmp_dir}/current_manifest"
  local status
  status="$(
    github_request \
      GET \
      'application/vnd.github+json' \
      "${API_BASE}/contents/${MANIFEST_PATH}?ref=${TARGET_BRANCH}" \
      "${response}"
  )"
  if [[ "${status}" == '404' ]]; then
    current_file_sha=''
    current_deployed_commit=''
    return
  fi
  if [[ "${status}" != '200' ]]; then
    echo "Failed to read current production manifest. GitHub API returned ${status}:" >&2
    cat "${response}" >&2
    return 1
  fi
  current_file_sha="$(
    python3 -c 'import json, sys; print(json.load(sys.stdin).get("sha", ""))' < "${response}"
  )"
  current_deployed_commit="$(
    python3 -c '
import base64
import json
import sys

response = json.load(sys.stdin)
content = base64.b64decode(response.get("content", "")).decode()
manifest = json.loads(content)
print(manifest.get("deployedCommit", ""))
' < "${response}"
  )"
}

ensure_publish_order() {
  if [[ -z "${current_deployed_commit}" ]]; then
    return
  fi
  if [[ "${current_deployed_commit}" == "${SERVICE_VERSION}" ]]; then
    echo "Manifest for ${SERVICE_VERSION} is already published"
    return 3
  fi
  if [[ ! "${current_deployed_commit}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Current production manifest has an invalid deployedCommit" >&2
    return 1
  fi

  local compare_response="${tmp_dir}/compare"
  local compare_status
  compare_status="$(
    github_request \
      GET \
      'application/vnd.github+json' \
      "${API_BASE}/compare/${current_deployed_commit}...${SERVICE_VERSION}" \
      "${compare_response}"
  )"
  if [[ "${compare_status}" != '200' ]]; then
    echo "Failed to compare deployed commits. GitHub API returned ${compare_status}:" >&2
    cat "${compare_response}" >&2
    return 1
  fi

  local relationship
  relationship="$(
    python3 -c 'import json, sys; print(json.load(sys.stdin).get("status", ""))' \
      < "${compare_response}"
  )"
  if [[ "${relationship}" == 'ahead' || "${relationship}" == 'identical' ]]; then
    return
  fi
  if [[ "${ALLOW_CONNECTOR_MANIFEST_ROLLBACK:-false}" == 'true' ]]; then
    echo "Allowing explicit manifest rollback from ${current_deployed_commit} to ${SERVICE_VERSION}"
    return
  fi

  echo "Refusing out-of-order manifest publication: ${SERVICE_VERSION} is ${relationship} relative to ${current_deployed_commit}. Set ALLOW_CONNECTOR_MANIFEST_ROLLBACK=true only for an intentional rollback." >&2
  return 1
}

build_payload() {
  MESSAGE="${commit_message}" CONTENT="${encoded}" BRANCH="${TARGET_BRANCH}" \
    FILE_SHA="${current_file_sha}" python3 -c '
import json
import os

payload = {
    "message": os.environ["MESSAGE"],
    "content": os.environ["CONTENT"],
    "branch": os.environ["BRANCH"],
}
if os.environ["FILE_SHA"]:
    payload["sha"] = os.environ["FILE_SHA"]
print(json.dumps(payload))
'
}

load_current_manifest
order_status=0
ensure_publish_order || order_status=$?
if [[ "${order_status}" == '3' ]]; then
  exit 0
elif [[ "${order_status}" != '0' ]]; then
  exit "${order_status}"
fi

put_response="${tmp_dir}/put"
put_status="$(
  github_request \
    PUT \
    'application/vnd.github+json' \
    "${API_BASE}/contents/${MANIFEST_PATH}" \
    "${put_response}" \
    "$(build_payload)"
)"

if [[ "${put_status}" == '409' || "${put_status}" == '422' ]]; then
  echo "Concurrent manifest update detected; re-checking deployment order"
  load_current_manifest
  order_status=0
  ensure_publish_order || order_status=$?
  if [[ "${order_status}" == '3' ]]; then
    exit 0
  elif [[ "${order_status}" != '0' ]]; then
    exit "${order_status}"
  fi
  put_status="$(
    github_request \
      PUT \
      'application/vnd.github+json' \
      "${API_BASE}/contents/${MANIFEST_PATH}" \
      "${put_response}" \
      "$(build_payload)"
  )"
fi

if [[ "${put_status}" != '200' && "${put_status}" != '201' ]]; then
  echo "Failed to publish manifest. GitHub API returned ${put_status}:" >&2
  cat "${put_response}" >&2
  exit 1
fi

echo "Published connector manifest from ${SERVICE_VERSION} to ${TARGET_BRANCH}"
