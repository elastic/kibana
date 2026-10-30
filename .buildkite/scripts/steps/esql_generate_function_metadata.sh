#!/usr/bin/env bash
set -euo pipefail

VALIDATION_PACKAGE_DIR="src/platform/packages/shared/esql/kbn-esql-language"
EDITOR_PACKAGE_DIR="src/platform/packages/private/kbn-language-documentation"
SCRIPTS_PACKAGE_DIR="src/platform/packages/private/kbn-esql-scripts"
GIT_SCOPE="$VALIDATION_PACKAGE_DIR/**/* $EDITOR_PACKAGE_DIR/**/*"
VERSION_BUMPED=false

report_main_step () {
  echo "--- $1"
}

maybe_update_esql_definitions () {
  local latest
  local current_esql
  local current_definitions

  latest=$(npm view @elastic/esql-definitions version 2>/dev/null)

  if [ -z "$latest" ]; then
    echo "Could not determine latest @elastic/esql-definitions version; skipping version bump."
    return
  fi

  # @elastic/esql and @elastic/esql-definitions are released together and must stay on the same version
  current_esql=$(node -e "console.log(require('./package.json').dependencies['@elastic/esql'])")
  current_definitions=$(node -e "console.log(require('./package.json').dependencies['@elastic/esql-definitions'])")

  if [ "$latest" == "$current_esql" ] && [ "$latest" == "$current_definitions" ]; then
    echo "@elastic/esql and @elastic/esql-definitions are already up to date ($latest). Skipping version bump."
    return
  fi

  echo "@elastic/esql: $current_esql → $latest, @elastic/esql-definitions: $current_definitions → $latest. Bumping both in package.json and the esql catalog in pnpm-workspace.yaml."
  sed -i "s/\"@elastic\/esql\": \"[^\"]*\"/\"@elastic\/esql\": \"$latest\"/" package.json
  sed -i "s/\"@elastic\/esql-definitions\": \"[^\"]*\"/\"@elastic\/esql-definitions\": \"$latest\"/" package.json
  # Only rewrite catalog entries (versions start with a digit), not the `'catalog:'` overrides
  sed -i -E "s/^(  '@elastic\/(esql-definitions|esql-grammar|esql-promql-grammar|esql-types|pretty-printer)'): '[0-9][^']*'/\1: '$latest'/" pnpm-workspace.yaml
  VERSION_BUMPED=true
}

main () {
  cd "$KIBANA_DIR"

  report_main_step "Check for @elastic/esql-definitions updates"

  maybe_update_esql_definitions

  report_main_step "Bootstrapping Kibana"

  pnpm kbn bootstrap --force-install --no-frozen-lockfile

  cd "$KIBANA_DIR/$SCRIPTS_PACKAGE_DIR"

  report_main_step "Generate function definitions and inline docs"

  pnpm generate

  report_main_step "Run i18n check"

  cd "$KIBANA_DIR"

  node scripts/i18n_check.js --fix

  # Check for differences
  set +e
  git diff --exit-code --quiet $GIT_SCOPE
  DIFF_EXIT=$?
  set -e

  if [ $DIFF_EXIT -eq 0 ] && [ "$VERSION_BUMPED" == "false" ]; then
    echo "No differences found. Our work is done here."
    exit
  fi

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE='[ES|QL] Update function metadata'
  PR_BODY='This PR updates the function definitions and inline docs based on the latest metadata from Elasticsearch.'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE (author:$KIBANA_MACHINE_USERNAME OR author:app/elastic-vault-github-plugin-prod)" --state open --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Committing changes."

  # Make a commit
  BRANCH_NAME="esql_generate_function_metadata_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add $GIT_SCOPE
  if [ "$VERSION_BUMPED" == "true" ]; then
    git add package.json pnpm-lock.yaml pnpm-workspace.yaml
  fi
  git commit -m "Update function metadata"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create a PR
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:ESQL'
}

main
