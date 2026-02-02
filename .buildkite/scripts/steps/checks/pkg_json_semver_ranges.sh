#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check package.json for non allowed semver ranges"
set +e
node scripts/check_pkg_json_semver_ranges
check_exit_code=$?

yarn kbn bootstrap --force-install
bootstrap_exit_code=$?
set -e

if [[ "${check_exit_code}" != "0" || "${bootstrap_exit_code}" != "0" ]]; then
  echo "node scripts/check_pkg_json_semver_ranges && yarn kbn bootstrap --force-install failed with an error - undoing any changes" >&2
  git checkout -- .
  exit 2
fi

check_for_changed_files 'node scripts/check_pkg_json_semver_ranges' true 'TO FIX: Run node '"'"'scripts/check_pkg_json_semver_ranges && yarn kbn bootstrap'"'"' locally and then commit the changes and push to your branch'
