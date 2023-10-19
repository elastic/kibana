#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Runs pre-commit hook script for the files touched in the last commit.
# That way we can ensure a set of quick commit checks earlier as we removed
# the pre-commit hook installation by default.
# If files are more than 200 we will skip it and just use
# the further ci steps that already check linting and file casing for the entire repo.
echo --- Run Precommit Hook

echo "!!!!!!!! ATTENTION !!!!!!!!
That check is intended to provide earlier CI feedback after we remove the automatic install for the local pre-commit hook.
If you want, you can still manually install the pre-commit hook locally by running 'node scripts/register_git_hook locally'
!!!!!!!!!!!!!!!!!!!!!!!!!!!"

# Run on all commits in a pull request
# Run on the most recent commmit otherwise, assuming squash and merge
if [[ "${BUILDKITE_PULL_REQUEST}" == "false" ]]; then
  START_REF="HEAD~1"
else
  START_REF="$BUILDKITE_BRANCH"
fi

node scripts/precommit_hook.js \
  --ref "$START_REF..HEAD" \
  --max-files 200 \
  --verbose \
  --fix \
  --no-stage # we have to disable staging or check_for_changed_files won't see the changes

check_for_changed_files 'node scripts/precommit_hook.js --ref HEAD~1..HEAD --fix' true
