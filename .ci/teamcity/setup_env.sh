#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/util.sh"

tc_set_env KIBANA_DIR "$(cd "$(dirname "$0")/../.." && pwd)"
tc_set_env XPACK_DIR "$KIBANA_DIR/x-pack"

tc_set_env CACHE_DIR "$HOME/.kibana"
tc_set_env PARENT_DIR "$(cd "$KIBANA_DIR/.."; pwd)"
tc_set_env WORKSPACE "${WORKSPACE:-$PARENT_DIR}"

tc_set_env KIBANA_PKG_BRANCH "$(jq -r .branch "$KIBANA_DIR/package.json")"
tc_set_env KIBANA_BASE_BRANCH "$KIBANA_PKG_BRANCH"

tc_set_env GECKODRIVER_CDNURL "https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
tc_set_env CHROMEDRIVER_CDNURL "https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
tc_set_env RE2_DOWNLOAD_MIRROR "https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
tc_set_env CYPRESS_DOWNLOAD_MIRROR "https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

tc_set_env NODE_OPTIONS "${NODE_OPTIONS:-} --max-old-space-size=4096"
tc_set_env BABEL_DISABLE_CACHE true

tc_set_env FORCE_COLOR 1
tc_set_env TEST_BROWSER_HEADLESS 1
tc_set_env CHECKS_REPORTER_ACTIVE false # TODO

if [[ "$(which google-chrome-stable)" || "$(which google-chrome)" ]]; then
  echo "Chrome detected, setting DETECT_CHROMEDRIVER_VERSION=true"
  tc_set_env DETECT_CHROMEDRIVER_VERSION true
  tc_set_env CHROMEDRIVER_FORCE_DOWNLOAD true
else
  echo "Chrome not detected, installing default chromedriver binary for the package version"
fi

# TODO vault keys

# TODO
if [[ -d "/home/agent/.kibana/node_modules" ]]; then
  echo 'Using node_modules cache'
  mv /home/agent/.kibana/node_modules .
fi
