#!/usr/bin/env bash
set -euo pipefail

report_main_step () {
  echo "--- $1"
}

main () {
  report_main_step "Bootstrap Kibana"


  report_main_step "Loading ES|QL documentation"


  docs_dir="x-pack/platform/plugins/shared/inference"
  set +e
  git diff --exit-code --quiet "$docs_dir"
  diff_exit_code=$?
  if [ $diff_exit_code -gt 1 ]; then
    echo "ERROR: git diff failed (exit code $diff_exit_code) for '$docs_dir'" >&2
    exit $diff_exit_code
  fi

  untracked_files=$(git ls-files --others --exclude-standard -- "$docs_dir")
  ls_files_exit_code=$?
  if [ $ls_files_exit_code -ne 0 ]; then
    echo "ERROR: git ls-files failed (exit code $ls_files_exit_code) for '$docs_dir'" >&2
    exit $ls_files_exit_code
  fi

  if [ $diff_exit_code -eq 0 ] && [ -z "$untracked_files" ]; then
    echo "No differences found. Our work is done here."
    exit 0
  fi
  set -e

  report_main_step "Differences found. Checking for an existing pull request."

  KIBANA_MACHINE_USERNAME="kibanamachine"
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  PR_TITLE='[ES|QL] Update documentation'
  PR_BODY='This PR updates the ES|QL documentation files generated from the built-docs repository.'

  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME"  --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit
  fi

  echo "No existing PR found. Proceeding."

  BRANCH_NAME="esql_docs_sync_$(date +%s)"

  git checkout -b "$BRANCH_NAME"

  git add "$docs_dir"
  git commit -m "Update ES|QL documentation" --no-verify

  report_main_step "Changes committed. Creating pull request."

  git push origin "$BRANCH_NAME"

  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head "${BRANCH_NAME}" --label 'release_note:skip' --label 'Team:AI Infra'
}

main
