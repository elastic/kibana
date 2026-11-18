#!/usr/bin/env bash

# First step of the Security Labs KB pipeline. The Contentstack webhook fires for every
# publish of the shared blog_v3 content type (Search/Observability Labs included), so webhook
# builds only upload the artifact build steps when the published Security Labs content differs
# from the content of the last build that uploaded artifacts. Any other build source always
# builds, and any failure to fingerprint or look up the last upload falls back to a full build.
# Webhook builds cancel running builds, so a webhook build also runs in full when a newer
# non-webhook build was canceled; otherwise an unrelated publish could drop a manual rebuild.
#
# Build meta-data:
#   security-labs-content-sha256  fingerprint of the published entries (set by this step)
#   security-labs-uploaded        "true" once artifacts are uploaded (run_security_labs_artifacts_ftr.sh)

set -euo pipefail

BUILD_PIPELINE=".buildkite/pipelines/gen_ai_security_labs_build.yml"
CONTENT_TYPES_FILE="x-pack/packages/ai-infra/security-labs-artifact-builder/src/contentstack_content_types.json"
CONTENTSTACK_HOST="${SECURITY_LABS_CONTENTSTACK_HOST:-cdn.contentstack.io}"
CONTENTSTACK_PAGE_SIZE=100

upload_build_steps() {
  echo "--- $1; uploading the Security Labs artifact build steps"
  buildkite-agent pipeline upload "$BUILD_PIPELINE"
  exit 0
}

fetch_content_type() {
  local content_type=$1 query=$2 skip=0 page count
  while :; do
    page="$(curl -fsS --get "https://${CONTENTSTACK_HOST}/v3/content_types/${content_type}/entries" \
      -H @<(printf 'api_key: %s\naccess_token: %s\n' \
        "$SECURITY_LABS_CONTENTSTACK_API_KEY" "$SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN") \
      --data-urlencode "environment=${SECURITY_LABS_CONTENTSTACK_ENVIRONMENT:-production}" \
      --data-urlencode "locale=${SECURITY_LABS_CONTENTSTACK_LOCALE:-en-us}" \
      --data-urlencode "limit=${CONTENTSTACK_PAGE_SIZE}" \
      --data-urlencode "skip=${skip}" \
      --data-urlencode "include_count=true" \
      --data-urlencode "query=${query}" \
      --data-urlencode "include[]=author" \
      --data-urlencode "include[]=categories")" || return 1
    jq -c --arg content_type "$content_type" '.entries[] | . + {_content_type: $content_type}' <<<"$page" || return 1
    count="$(jq -e '.count' <<<"$page")" || return 1
    skip=$((skip + CONTENTSTACK_PAGE_SIZE))
    if (( skip >= count )); then
      break
    fi
  done
}

# Hashes the published entries, ignoring fields that change on every (re)publish without a
# content change.
fingerprint_content() {
  local content_types content_type
  if [[ -n "${SECURITY_LABS_CONTENTSTACK_CONTENT_TYPES:-}" ]]; then
    content_types="$(tr ',' '\n' <<<"$SECURITY_LABS_CONTENTSTACK_CONTENT_TYPES")"
  else
    content_types="$(jq -r 'keys_unsorted[]' "$CONTENT_TYPES_FILE")"
  fi

  for content_type in $content_types; do
    fetch_content_type "$content_type" "$(jq -c --arg type "$content_type" '.[$type] // {}' "$CONTENT_TYPES_FILE")" || exit 1
  done |
    jq -s -c -S 'sort_by(._content_type, .uid)
      | walk(if type == "object" then del(.publish_details, .updated_at, .updated_by, ._version, .ACL, ._workflow, ._in_progress) else . end)' |
    sha256sum | cut -d ' ' -f 1
}

list_builds() {
  curl -fsS -H @<(printf 'Authorization: Bearer %s\n' "$BUILDKITE_TOKEN") \
    "https://api.buildkite.com/v2/organizations/${BUILDKITE_ORGANIZATION_SLUG}/pipelines/${BUILDKITE_PIPELINE_SLUG}/builds?$1"
}

# Prints "<build number> <fingerprint>" for the newest other build that uploaded artifacts.
last_uploaded_build() {
  list_builds 'meta_data%5Bsecurity-labs-uploaded%5D=true&per_page=50' |
    jq -r --argjson current "$BUILDKITE_BUILD_NUMBER" \
      '[.[] | select(.number != $current and .meta_data["security-labs-uploaded"] == "true")][0]
        | select(. != null) | "\(.number) \(.meta_data["security-labs-content-sha256"] // "")"'
}

# Prints the number of the newest canceled non-webhook build after build $1, if any.
canceled_build_since() {
  list_builds 'state%5B%5D=canceled&state%5B%5D=canceling&per_page=50' |
    jq -r --argjson since "$1" --argjson current "$BUILDKITE_BUILD_NUMBER" \
      '[.[] | select(.number > $since and .number != $current
          and (.state == "canceled" or .state == "canceling") and .source != "webhook")][0]
        | select(. != null) | .number'
}

if [[ ! "$CONTENTSTACK_HOST" =~ ^([a-z0-9-]+-)?cdn\.contentstack\.(io|com)$ ]]; then
  upload_build_steps "Unexpected Contentstack host [${CONTENTSTACK_HOST}]; not fingerprinting"
fi

if [[ -z "${SECURITY_LABS_CONTENTSTACK_API_KEY:-}" || -z "${SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN:-}" ]]; then
  upload_build_steps "Contentstack credentials unavailable; not fingerprinting"
fi

echo "--- Fingerprint published Security Labs content"
if ! fingerprint="$(fingerprint_content)" || [[ -z "$fingerprint" ]]; then
  upload_build_steps "Unable to fingerprint Security Labs content"
fi
echo "Security Labs content fingerprint: ${fingerprint}"
buildkite-agent meta-data set security-labs-content-sha256 "$fingerprint"

if [[ "${BUILDKITE_SOURCE:-}" != "webhook" ]]; then
  upload_build_steps "Build source is [${BUILDKITE_SOURCE:-unknown}], not the Contentstack webhook"
fi

if [[ -z "${BUILDKITE_TOKEN:-}" ]]; then
  upload_build_steps "BUILDKITE_TOKEN unset; cannot look up the last upload"
fi

echo "--- Compare with the last build that uploaded artifacts"
if ! last="$(last_uploaded_build)" || [[ -z "$last" ]]; then
  upload_build_steps "No previous upload found"
fi
read -r last_build_number last_fingerprint <<<"$last"

if [[ "$fingerprint" != "$last_fingerprint" ]]; then
  upload_build_steps "Security Labs content changed since build #${last_build_number}"
fi

if ! canceled_build="$(canceled_build_since "$last_build_number")"; then
  upload_build_steps "Unable to look up canceled builds since build #${last_build_number}"
fi
if [[ -n "$canceled_build" ]]; then
  upload_build_steps "Build #${canceled_build} (not started by the webhook) was canceled after build #${last_build_number}"
fi

message="Security Labs content is unchanged since build #${last_build_number}; skipped the artifact build."
echo "$message"
buildkite-agent annotate --style info --context security-labs-content-gate "$message"
