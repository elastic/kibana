#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Bazel Packages Manifest
node scripts/generate packages_build_manifest
check_for_changed_files 'node scripts/generate packages_build_manifest' true

echo --- Check Codeowners Manifest
if [ -f ".github/CODEOWNERS" ]; then
  node scripts/generate codeowners
  check_for_changed_files 'node scripts/generate codeowners' true
else
  echo "skipping, no existing .github/CODEOWNERS file found"
fi
