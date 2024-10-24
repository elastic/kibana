#!/usr/bin/env bash

set -euo pipefail

echo "--- Publish OAS docs"

deploy_to_bump() {
  local file_path="${1:-}"
  local doc_name="${2:-}"
  local doc_token="${3:-}"
  local change_count=$(bump diff $file_path --doc $doc_name --token $doc_token --format=json | jq -R 'fromjson? | length')
  if [[ ! -z $change_count && $change_count -gt 0 ]]; then
    echo "About to deploy $file_path to bump.sh..."
    bump deploy $file_path \
      --doc $doc_name \
      --token $doc_token;
  else
    echo "Did not detect changes in $file_path; not deploying."
  fi
}

if [[ "$BUILDKITE_BRANCH" == "main" ]]; then
  BUMP_KIBANA_DOC_NAME="$(vault_get TODO TODO)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get TODO TODO)"
  deploy_to_bump oas_docs/output/kibana.yaml $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN;

  # We should only do this after a successfull rollout to prod, i.e. once e2e tests passed
  # BUMP_KIBANA_SERVERLESS_DOC_NAME="$(vault_get TODO TODO)"
  # BUMP_KIBANA_SERVERLESS_DOC_TOKEN="$(vault_get TODO TODO)"
  # deploy_to_bump oas_docs/output/kibana.serverless.yaml $BUMP_KIBANA_SERVERLESS_DOC_NAME $BUMP_KIBANA_SERVERLESS_DOC_TOKEN;
fi