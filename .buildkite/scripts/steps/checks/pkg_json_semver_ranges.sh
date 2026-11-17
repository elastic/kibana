#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check package.json for non allowed semver ranges"
set +e
node scripts/check_pkg_json_semver_ranges
check_exit_code=$?

bootstrap_exit_code=0
if [[ "${check_exit_code}" == "0" && -n "$(git status --porcelain -- package.json)" ]]; then
  pnpm kbn bootstrap --force-install
  bootstrap_exit_code=$?
fi
set -e

if [[ "${check_exit_code}" != "0" || "${bootstrap_exit_code}" != "0" ]]; then
  echo "node scripts/check_pkg_json_semver_ranges && pnpm kbn bootstrap --force-install failed with an error - undoing any changes" >&2
  git checkout -- .
  exit 2
fi

check_for_changed_files 'node scripts/check_pkg_json_semver_ranges' true
