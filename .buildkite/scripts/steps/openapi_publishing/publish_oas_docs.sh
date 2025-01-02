#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Publish OAS docs"

echo "--- Installing NPM modules"

deploy_to_bump() {
  local file_path="${1:-}"
  local doc_name="${2:-}"
  local doc_token="${3:-}"
  local branch="${4:-}"
  local cur_dir=$(pwd)

  cd "$(dirname "${BASH_SOURCE[0]}")"
  npm install

  echo "Checking diff for doc '$doc_name' against file '$file_path' on branch '$branch'..."
  local result=$(npx bump diff $file_path --doc $doc_name --token $doc_token --branch $branch --format=json)
  local change_count=$(jq '. | length' <<<$result)
  if [[ ! -z $change_count && $change_count -gt 0 ]]; then
    echo "Found $change_count changes..."
    echo "About to deploy file '$file_path' to doc '$doc_name' to '$branch' on bump.sh..."
    npx bump deploy $file_path \
      --branch $branch \
      --doc $doc_name \
      --token $doc_token ;
    echo ""
    echo "Note: if there is a warning of unchanged docs we probably have unpublished deployments waiting."
    echo "Go to https://bump.sh/elastic/dashboard to see all the docs in the hub."
  else
    echo "Did not detect changes for '$file_path'; not deploying. Got response: '$result'"
  fi

  echo "Switch back to dir '$cur_dir'"
  cd $cur_dir
}

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  BUMP_KIBANA_DOC_NAME="$(vault_get kibana-bump-sh kibana-doc-name)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get kibana-bump-sh kibana-token)"
  deploy_to_bump "$(pwd)/oas_docs/output/kibana.yaml" $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN main;
  exit 0;
fi

if [[ "$BUILDKITE_BRANCH" == "8.x" ]]; then
  BUMP_KIBANA_DOC_NAME="$(vault_get kibana-bump-sh kibana-doc-name)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get kibana-bump-sh kibana-token)"
  deploy_to_bump "$(pwd)/oas_docs/output/kibana.yaml" $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN 8x-unreleased;
  exit 0;
fi

echo "No branches found to push to; stopping here."