#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo "---Attempting to compute chromium version for provided puppeteer version"

CHROMIUM_VERSION_OUTPUT=$(node scripts/chromium_version $PUPPETEER_VERSION)

echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chromium commit" | awk '{print $5}' | buildkite-agent meta-data set "chromium_commit_hash"
echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chrome version" | awk '{print $5}' | buildkite-agent meta-data set "chromium_version"
echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chromium revision" | awk '{print $5}' | buildkite-agent meta-data set "chromium_revision"
