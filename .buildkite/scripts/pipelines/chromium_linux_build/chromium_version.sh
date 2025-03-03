#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo "---Attempting to compute chromium version for provided puppeteer version"

echo "$(node scripts/chromium_version $PUPPETEER_VERSION)" | grep -i "chromium commit" | awk '{print $5}' | buildkite-agent meta-data set "chromium_commit_hash"
# echo "$(node scripts/chromium_version $PUPPETEER_VERSION)" | grep -i "chrome version" | awk '{print $5}' | buildkite-agent meta-data set "chromium_version"
# echo "$(node scripts/chromium_version $PUPPETEER_VERSION)" | grep -i "chromium revision" | awk '{print $5}' | buildkite-agent meta-data set "chromium_revision"
