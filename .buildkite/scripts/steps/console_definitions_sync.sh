#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/steps/console_definitions/sync_pr_lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/console_definitions/sync_pr_lib.sh"

# Narrowed to json/ only so it doesn't overlap with the kibana_api_doc_links_sync step,
# whose output lives under kibana_api_doc_links/ in the same parent directory.
GIT_SCOPE="src/platform/plugins/shared/console/server/lib/spec_definitions/json"

CONSOLE_DEFINITIONS_SYNC_PR_BODY=$'This PR updates the console definitions to match the latest ones from the @elastic/elasticsearch-specification repo.

## If override conflict CI fails

PR CI runs the override conflict contract test in `@kbn/generate-console-definitions`. If `kibana-ci` fails on that test, a curated override is masking changed generated rules.

1. Review each reported conflict in the Jest log.
2. Keep the override only if it is still intentional; otherwise update or remove it.
3. Run `node scripts/audit_console_definition_overrides.js --updateOverrideAudit`.
4. Commit the updated `packages/kbn-generate-console-definitions/src/override_conflict_baseline.json`.'

main() {
  cd "$PARENT_DIR"

  echo "--- Cloning elasticsearch-specification"
  rm -rf elasticsearch-specification
  if ! git clone --branch "$BUILDKITE_BRANCH" https://github.com/elastic/elasticsearch-specification --depth 1; then
    echo "Error: Failed to clone the elasticsearch-specification repository."
    exit 1
  fi

  echo "--- Bootstrapping Kibana"
  cd "$KIBANA_DIR"
  .buildkite/scripts/bootstrap.sh

  echo "--- Generating console definitions"
  node scripts/generate_console_definitions.js \
    --source "$PARENT_DIR/elasticsearch-specification" \
    --emptyDest \
    --skipOverrideAudit

  create_sync_pr \
    "$GIT_SCOPE" \
    "[Console] Update console definitions (${BUILDKITE_BRANCH})" \
    "$CONSOLE_DEFINITIONS_SYNC_PR_BODY" \
    "console_definitions_sync" \
    "Update console definitions" \
    "console_defs_existing_pr" \
    true \
    'backport:skip' 'release_note:skip' 'Feature:Console' 'Team:Kibana Management'
}

main
