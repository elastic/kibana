#!/usr/bin/env bash

export CI=true

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"

export CACHE_DIR="$HOME/.kibana"
PARENT_DIR="$(cd "$KIBANA_DIR/.."; pwd)"
export PARENT_DIR
export WORKSPACE="${WORKSPACE:-$PARENT_DIR}"

# A few things, such as Chrome, respect this variable
# For many agent types, the workspace is mounted on a local ssd, so will be faster than the default tmp dir location
if [[ -d /opt/local-ssd/buildkite ]]; then
  export TMPDIR="/opt/local-ssd/buildkite/tmp"
  mkdir -p "$TMPDIR"
fi

KIBANA_PKG_BRANCH="$(jq -r .branch "$KIBANA_DIR/package.json")"
export KIBANA_PKG_BRANCH
export KIBANA_BASE_BRANCH="$KIBANA_PKG_BRANCH"

KIBANA_PKG_VERSION="$(jq -r .version "$KIBANA_DIR/package.json")"
export KIBANA_PKG_VERSION

export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export RE2_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

export NODE_OPTIONS="--max-old-space-size=4096"

export FORCE_COLOR=1
export TEST_BROWSER_HEADLESS=1

export ELASTIC_APM_ENVIRONMENT=ci
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1
export ELASTIC_APM_SERVER_URL=https://kibana-ci-apm.apm.us-central1.gcp.cloud.es.io
export ELASTIC_APM_SECRET_TOKEN=7YKhoXsO4MzjhXjx2c

if is_pr; then
  if [[ "${GITHUB_PR_LABELS:-}" == *"ci:collect-apm"* ]]; then
    export ELASTIC_APM_ACTIVE=true
    export ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=false
  else
    export ELASTIC_APM_ACTIVE=true
    export ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=true
  fi

  if [[ "${GITHUB_STEP_COMMIT_STATUS_ENABLED:-}" != "true" ]]; then
    export CHECKS_REPORTER_ACTIVE=true
  else
    export CHECKS_REPORTER_ACTIVE=false
  fi

  # These can be removed once we're not supporting Jenkins and Buildkite at the same time
  # These are primarily used by github checks reporter and can be configured via /github_checks_api.json
  export ghprbGhRepository="elastic/kibana"
  export ghprbActualCommit="$BUILDKITE_COMMIT"
  export BUILD_URL="$BUILDKITE_BUILD_URL"

  set_git_merge_base

  # For backwards compatibility
  export PR_MERGE_BASE="$GITHUB_PR_MERGE_BASE"
  export PR_TARGET_BRANCH="$GITHUB_PR_TARGET_BRANCH"
else
  export ELASTIC_APM_ACTIVE=true
  export ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=false
  export CHECKS_REPORTER_ACTIVE=false
fi

# These are for backwards-compatibility
export GIT_COMMIT="${BUILDKITE_COMMIT:-}"
export GIT_BRANCH="${BUILDKITE_BRANCH:-}"

export FLEET_PACKAGE_REGISTRY_PORT=6104
export TEST_CORS_SERVER_PORT=6105

# Mac agents currently don't have Chrome
if [[ "$(which google-chrome-stable)" || "$(which google-chrome)" ]]; then
  echo "Chrome detected, setting DETECT_CHROMEDRIVER_VERSION=true"
  export DETECT_CHROMEDRIVER_VERSION=true
  export CHROMEDRIVER_FORCE_DOWNLOAD=true
else
  echo "Chrome not detected, installing default chromedriver binary for the package version"
fi

export GCS_UPLOAD_PREFIX=FAKE_UPLOAD_PREFIX # TODO remove the need for this

export KIBANA_BUILD_LOCATION="$WORKSPACE/kibana-build-xpack"

if [[ "${BUILD_TS_REFS_CACHE_ENABLE:-}" != "true" ]]; then
  export BUILD_TS_REFS_CACHE_ENABLE=false
fi

export BUILD_TS_REFS_DISABLE=true
export DISABLE_BOOTSTRAP_VALIDATION=true
