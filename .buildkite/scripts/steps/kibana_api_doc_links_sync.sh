#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/steps/console_definitions/sync_pr_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/console_definitions/sync_pr_lib.sh"

GIT_SCOPE="src/platform/plugins/shared/console/server/lib/spec_definitions/kibana_api_doc_links"

main() {
  cd "$KIBANA_DIR"

  echo "--- Bootstrapping Kibana"
  .buildkite/scripts/bootstrap.sh

  echo "--- Generating Kibana API doc links"
  node scripts/generate_kibana_api_doc_links.js

  create_sync_pr \
    "$GIT_SCOPE" \
    "[Console] Update Kibana API doc links (${BUILDKITE_BRANCH})" \
    "This PR updates the Kibana API doc-link map used by Console's \"Open API reference\" links to match oas_docs/output/kibana.yaml." \
    "kibana_api_doc_links_sync" \
    "Update Kibana API doc links" \
    "kibana_api_doc_links_existing_pr" \
    'backport:skip' 'release_note:skip' 'Feature:Console' 'Team:Kibana Management'
}

main
