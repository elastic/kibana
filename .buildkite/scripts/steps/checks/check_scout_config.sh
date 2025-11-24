#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check for unregistered Scout Playwright configs
node scripts/scout discover-playwright-configs --validate

echo --- Make sure Scout config manifests are up to date
node scripts/scout update-test-config-manifests
check_for_changed_files \
  "node scripts/scout update-test-config-manifests" \
  true \
  "[Scout] Automated config manifest updates"
