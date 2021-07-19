#!/usr/bin/env bash

export CI=true

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"

export CACHE_DIR="$HOME/.kibana"
PARENT_DIR="$(cd "$KIBANA_DIR/.."; pwd)"
export PARENT_DIR
export WORKSPACE="${WORKSPACE:-$PARENT_DIR}"

KIBANA_PKG_BRANCH="$(jq -r .branch "$KIBANA_DIR/package.json")"
export KIBANA_PKG_BRANCH
export KIBANA_BASE_BRANCH="$KIBANA_PKG_BRANCH"

export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export RE2_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

export NODE_OPTIONS="--max-old-space-size=4096"

export FORCE_COLOR=1
export TEST_BROWSER_HEADLESS=1

export ELASTIC_APM_ENVIRONMENT=ci
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1

CI_REPORTING_ENABLED=false # TODO enable when ready, only controls checks reporter and APM

if is_pr; then
  export ELASTIC_APM_ACTIVE=false
  export CHECKS_REPORTER_ACTIVE="${CI_REPORTING_ENABLED-}"

  # These can be removed once we're not supporting Jenkins and Buildkite at the same time
  # These are primarily used by github checks reporter and can be configured via /github_checks_api.json
  export ghprbGhRepository="elastic/kibana"
  export ghprbActualCommit="$BUILDKITE_COMMIT"
  export BUILD_URL="$BUILDKITE_BUILD_URL"

  # set_git_merge_base # TODO for PRs
else
  export ELASTIC_APM_ACTIVE="${CI_REPORTING_ENABLED-}"
  export CHECKS_REPORTER_ACTIVE=false
fi

export FLEET_PACKAGE_REGISTRY_PORT=6104
export TEST_CORS_SERVER_PORT=6105

export DETECT_CHROMEDRIVER_VERSION=true
export CHROMEDRIVER_FORCE_DOWNLOAD=true

export GCS_UPLOAD_PREFIX=FAKE_UPLOAD_PREFIX # TODO remove the need for this

export KIBANA_BUILD_LOCATION="$WORKSPACE/kibana-build-xpack"

if [[ "${BUILD_TS_REFS_CACHE_ENABLE:-}" != "true" ]]; then
  export BUILD_TS_REFS_CACHE_ENABLE=false
fi

export BUILD_TS_REFS_DISABLE=true
export DISABLE_BOOTSTRAP_VALIDATION=true

export TEST_KIBANA_HOST=localhost
export TEST_KIBANA_PORT=6101
export TEST_KIBANA_URL="http://elastic:changeme@localhost:6101"
export TEST_ES_URL="http://elastic:changeme@localhost:6102"
export TEST_ES_TRANSPORT_PORT=6103
export TEST_CORS_SERVER_PORT=6106
export ALERTING_PROXY_PORT=6105
