#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
.buildkite/scripts/bootstrap.sh

echo "---Attempting to compute chromium version for provided puppeteer version"

if [[ ! ${PUPPETEER_VERSION:-} =~ ^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$ ]]; then
  echo "PUPPETEER_VERSION is not a valid x.y.z version: ${PUPPETEER_VERSION:-<unset>}"
  exit 1
fi

CHROMIUM_VERSION_OUTPUT=$(node scripts/chromium_version "$PUPPETEER_VERSION")

echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chromium commit" | awk '{print $5}' | buildkite-agent meta-data set "chromium_commit_hash"
echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chrome version" | awk '{print $5}' | buildkite-agent meta-data set "chromium_version"
echo "$CHROMIUM_VERSION_OUTPUT" | grep -i "chromium revision" | awk '{print $5}' | buildkite-agent meta-data set "chromium_revision"
