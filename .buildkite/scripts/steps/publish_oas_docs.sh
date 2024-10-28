#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/serverless/publish_oas/publish_oas_utils.sh

echo "--- Publish OAS docs"

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