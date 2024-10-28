#!/usr/bin/env bash

source .buildkite/scripts/serverless/publish_oas/publish_oas_utils.sh

KIBANA_COMMIT_SHA=$(buildkite-agent meta-data get selected-commit)

if [[ ! -z KIBANA_COMMIT_SHA ]]; then
  echo "--- Deploying $KIBANA_COMMIT_SHA to bump.sh";
  git checkout $KIBANA_COMMIT_SHA;
  BUMP_KIBANA_DOC_NAME="$(vault_get kibana-bump-sh kibana-serverless-doc-name)"
  BUMP_KIBANA_DOC_TOKEN="$(vault_get kibana-bump-sh kibana-serverless-token)"
  deploy_to_bump oas_docs/output/kibana.serverless.yaml $BUMP_KIBANA_DOC_NAME $BUMP_KIBANA_DOC_TOKEN main;
else
  echo "No Kibana commit SHA provided, not deploying anything to bump.sh";
  exit 1;
fi
