#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Check package.json for non allowed semver ranges"
node scripts/check_pkg_json_semver_ranges
yarn kbn bootstrap --force-install

check_for_changed_files 'node scripts/check_pkg_json_semver_ranges' true 'TO FIX: Run node '"'"'scripts/check_pkg_json_semver_ranges && yarn kbn bootstrap'"'"' locally and then commit the changes and push to your branch'
