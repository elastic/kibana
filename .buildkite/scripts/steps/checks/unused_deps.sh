#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Temporarily skipped for the pnpm migration: pnpm generates a gitignored
# package.json per package, which knip treats as a package boundary and skips,
# producing ~260 false-positive "unused" deps. Tracked in
# https://github.com/elastic/kibana/issues/276638
echo --- Check for unused dependencies "(skipped: https://github.com/elastic/kibana/issues/276638)"
echo "Skipping knip unused-dependency check while the pnpm migration is in progress."
echo "See https://github.com/elastic/kibana/issues/276638"
exit 0

# shellcheck disable=SC2317
node scripts/knip --workspace . --include dependencies,devDependencies
