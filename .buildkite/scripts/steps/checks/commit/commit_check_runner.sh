#!/usr/bin/env bash

run_quick_commit_checks() {
  echo "!!!!!!!! ATTENTION !!!!!!!!
That check is intended to provide earlier CI feedback after we remove the automatic install for the local pre-commit hook.
If you want, you can still manually install the pre-commit hook locally by running 'node scripts/register_git_hook locally'
!!!!!!!!!!!!!!!!!!!!!!!!!!!
"

  node scripts/precommit_hook.js --ref HEAD~1..HEAD --max-files 200 --verbose
}

run_quick_commit_checks
