#!/usr/bin/env bash

set -euo pipefail

# install puppeteer to the version we built chromium for
yarn add "puppeteer@${PUPPETEER_VERSION}"

# download the chromium build artefacts from prior step
buildkite-agent artifact download chromium-*

# next we want to update the values in the paths file
# src/platform/packages/private/kbn-screenshotting-server/src/paths.ts

# https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json

