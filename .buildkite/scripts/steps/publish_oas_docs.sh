#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Publish OAS docs"

deploy_to_bump() {
  local file_path="${1:-}"
  local doc_name="${2:-}"
  local doc_token="${3:-}"
  local branch="${4:-}"

  echo "Checking diff for doc '$doc_name' against file '$file_path'..."
  local result=$(bump diff $file_path --doc $doc_name --token $doc_token --branch $branch --format=json)
  ## Bump.sh does not respond with JSON when the diff is empty so we need to handle possibly not JSON :'(
  local change_count=$(tr '\n' ' '<<<$result | jq -R 'fromjson? | length')
  if [[ ! -z $change_count && $change_count -gt 0 ]]; then
    echo "Found $change_count changes..."
    echo "About to deploy file '$file_path' to doc '$doc_name' on bump.sh..."
    bump deploy $file_path \
      --branch $branch \
      --doc $doc_name \
      --token $doc_token ;
    echo ""
    echo "Note: if there is a warning of unchanged docs we probably have unpublished deployments waiting."
    echo "Go to https://bump.sh/elastic/dashboard to see all the docs in the hub."
  else
    echo "Did not detect changes for '$file_path'; not deploying. Got response: $result"
  fi
}

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  BUMP_KIBANA_DOC_NAME="$(vault_get kibana-bump-sh kibana-doc-name)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get kibana-bump-sh kibana-token)"
  deploy_to_bump oas_docs/output/kibana.yaml $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN main;
fi

if [[ "$BUILDKITE_BRANCH" == "8.x" ]]; then
  BUMP_KIBANA_DOC_NAME="$(vault_get kibana-bump-sh kibana-doc-name)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get kibana-bump-sh kibana-token)"
  deploy_to_bump oas_docs/output/kibana.yaml $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN v8;
fi