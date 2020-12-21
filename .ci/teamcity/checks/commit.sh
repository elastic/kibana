#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

# Runs pre-commit hook script for the files touched in the last commit.
# That way we can ensure a set of quick commit checks earlier as we removed
# the pre-commit hook installation by default.
# If files are more than 200 we will skip it and just use
# the further ci steps that already check linting and file casing for the entire repo.
checks-reporter-with-killswitch "Quick commit checks" \
  "$(dirname "${0}")/commit_check_runner.sh"
