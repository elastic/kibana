#!/usr/bin/env bash

set -euo pipefail

echo "--- Publish OAS docs"

BUMP_KIBANA_DOC_NAME="$(vault_get TODO TODO)"
BUMP_KIBANA_DOC_TOKEN="$(vault_get TODO TODO)"
bump deploy oas_docs/output/kibana.yaml \
  --doc $BUMP_KIBANA_DOC_NAME \
  --token $BUMP_KIBANA_DOC_TOKEN

BUMP_KIBANA_SERVERLESS_DOC_NAME="$(vault_get TODO TODO)"
BUMP_KIBANA_SERVERLESS_DOC_TOKEN="$(vault_get TODO TODO)"
bump deploy oas_docs/output/kibana.serverless.yaml \
  --doc $BUMP_KIBANA_SERVERLESS_DOC_NAME \
  --token $BUMP_KIBANA_SERVERLESS_DOC_TOKEN

