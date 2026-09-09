#!/usr/bin/env bash
set -euo pipefail

VALIDATION_PACKAGE_DIR="src/platform/packages/shared/kbn-esql-language"
EDITOR_PACKAGE_DIR="src/platform/packages/private/kbn-language-documentation"
SCRIPTS_PACKAGE_DIR="src/platform/packages/private/kbn-esql-scripts"
GIT_SCOPE="$VALIDATION_PACKAGE_DIR/**/* $EDITOR_PACKAGE_DIR/**/*"
VERSION_BUMPED=false

report_main_step () {
  echo "--- $1"
}

maybe_update_esql_definitions () {
  local latest
  local current

  latest=$(npm view @elastic/esql-definitions version 2>/dev/null)

  if [ -z "$latest" ]; then
    echo "Could not determine latest @elastic/esql-definitions version; skipping version bump."
    return
  fi

  current=$(node -e "console.log(require('./package.json').dependencies['@elastic/esql'])")

  if [ "$latest" == "$current" ]; then
    echo "@elastic/esql-definitions is already up to date ($current). Skipping version bump."
    return
  fi

  echo "@elastic/esql-definitions: $current → $latest. Bumping @elastic/esql in package.json."
  sed -i "s/\"@elastic\/esql\": \"[^\"]*\"/\"@elastic\/esql\": \"$latest\"/" package.json
  VERSION_BUMPED=true
}

main () {
  cd "$KIBANA_DIR"

  report_main_step "Check for @elastic/esql-definitions updates"

  maybe_update_esql_definitions

  report_main_step "Bootstrapping Kibana"

  .buildkite/scripts/bootstrap.sh

  cd "$KIBANA_DIR/$SCRIPTS_PACKAGE_DIR"

  report_main_step "Generate function definitions"

  yarn make:defs

  report_main_step "Generate inline function docs"

  yarn make:docs

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
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

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
    git add package.json yarn.lock
  fi
  git commit -m "Update function metadata"

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  # Create a PR
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:ESQL'
}

main
