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

tc_set_env FORCE_COLOR 1
tc_set_env TEST_BROWSER_HEADLESS 1

tc_set_env ELASTIC_APM_ENVIRONMENT ci

if [[ "${KIBANA_CI_REPORTER_KEY_BASE64-}" ]]; then
  tc_set_env KIBANA_CI_REPORTER_KEY "$(echo "$KIBANA_CI_REPORTER_KEY_BASE64" | base64 -d)"
fi

if is_pr; then
  tc_set_env CHECKS_REPORTER_ACTIVE true

  # These can be removed once we're not supporting Jenkins and TeamCity at the same time
  # These are primarily used by github checks reporter and can be configured via /github_checks_api.json
  tc_set_env ghprbGhRepository "elastic/kibana" # TODO?
  tc_set_env ghprbActualCommit "$GITHUB_PR_TRIGGERED_SHA"
  tc_set_env BUILD_URL "$TEAMCITY_BUILD_URL"
else
  tc_set_env CHECKS_REPORTER_ACTIVE false
fi

tc_set_env FLEET_PACKAGE_REGISTRY_PORT 6104 # Any unused port is fine, used by ingest manager tests

if [[ "$(which google-chrome-stable)" || "$(which google-chrome)" ]]; then
  echo "Chrome detected, setting DETECT_CHROMEDRIVER_VERSION=true"
  tc_set_env DETECT_CHROMEDRIVER_VERSION true
  tc_set_env CHROMEDRIVER_FORCE_DOWNLOAD true
else
  echo "Chrome not detected, installing default chromedriver binary for the package version"
fi
