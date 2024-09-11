#!/usr/bin/env bash

echo '--- Setup environment vars'

export CI=true

KIBANA_DIR=$(pwd)
export KIBANA_DIR
export XPACK_DIR="$KIBANA_DIR/x-pack"

export CACHE_DIR="$HOME/.kibana"
export ES_CACHE_DIR="$HOME/.es-snapshot-cache"
PARENT_DIR="$(cd "$KIBANA_DIR/.."; pwd)"
export PARENT_DIR
export WORKSPACE="${WORKSPACE:-$PARENT_DIR}"

export DOCS_REPO_CACHE_DIR="$HOME/.docs-repos"

# A few things, such as Chrome, respect this variable
# For many agent types, the workspace is mounted on a local ssd, so will be faster than the default tmp dir location
if [[ -d /opt/local-ssd/buildkite ]]; then
  export TMPDIR="/opt/local-ssd/buildkite/tmp"
  mkdir -p "$TMPDIR"
fi

if command -v jq >/dev/null 2>&1; then
  KIBANA_PKG_BRANCH="$(jq -r .branch "$KIBANA_DIR/package.json")"
  export KIBANA_PKG_BRANCH
  export KIBANA_BASE_BRANCH="$KIBANA_PKG_BRANCH"

  KIBANA_PKG_VERSION="$(jq -r .version "$KIBANA_DIR/package.json")"
  export KIBANA_PKG_VERSION
fi

# Detects and exports the final target branch when using a merge queue
if [[ "${BUILDKITE_BRANCH:-}" == "gh-readonly-queue"* ]]; then
  # removes gh-readonly-queue/
  BKBRANCH_WITHOUT_GH_MQ_PREFIX="${BUILDKITE_BRANCH#gh-readonly-queue/}"

  # extracts target mqueue branch
  MERGE_QUEUE_TARGET_BRANCH=${BKBRANCH_WITHOUT_GH_MQ_PREFIX%/*}
else
  MERGE_QUEUE_TARGET_BRANCH=""
fi
export MERGE_QUEUE_TARGET_BRANCH

# Exports BUILDKITE_BRANCH_MERGE_QUEUE which will use the value from MERGE_QUEUE_TARGET_BRANCH if defined otherwise
# will fallback to BUILDKITE_BRANCH.
BUILDKITE_BRANCH_MERGE_QUEUE="${MERGE_QUEUE_TARGET_BRANCH:-${BUILDKITE_BRANCH:-}}"
export BUILDKITE_BRANCH_MERGE_QUEUE

BUILDKITE_AGENT_GCP_REGION=""
if [[ "$(curl -is metadata.google.internal || true)" ]]; then
  # projects/1003139005402/zones/us-central1-a -> us-central1-a -> us-central1
  BUILDKITE_AGENT_GCP_REGION=$(curl -sH Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/zone | rev | cut -d'/' -f1 | cut -c3- | rev)
fi
export BUILDKITE_AGENT_GCP_REGION

CI_PROXY_CACHE_SUFFIX=""
if [[ "$BUILDKITE_AGENT_GCP_REGION" ]]; then
  CI_PROXY_CACHE_SUFFIX="/region/$BUILDKITE_AGENT_GCP_REGION"
fi

export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache$CI_PROXY_CACHE_SUFFIX"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache$CI_PROXY_CACHE_SUFFIX"
export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache$CI_PROXY_CACHE_SUFFIX/cypress"

export NODE_OPTIONS="--max-old-space-size=4096"

export FORCE_COLOR=1
export TEST_BROWSER_HEADLESS=1

export ELASTIC_APM_ENVIRONMENT=ci
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1
export ELASTIC_APM_KIBANA_FRONTEND_ACTIVE=false

if is_pr; then
  if is_pr_with_label "ci:collect-apm"; then
    export ELASTIC_APM_ACTIVE=true
    export ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=false
  else
    export ELASTIC_APM_ACTIVE=true
    export ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=true
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

export DISABLE_BOOTSTRAP_VALIDATION=true

# Prevent Browserlist from logging on CI about outdated database versions
export BROWSERSLIST_IGNORE_OLD_DATA=true

# keys used to associate test group data in ci-stats with Jest execution order
export TEST_GROUP_TYPE_UNIT="Jest Unit Tests"
export TEST_GROUP_TYPE_INTEGRATION="Jest Integration Tests"
export TEST_GROUP_TYPE_FUNCTIONAL="Functional Tests"

# tells the gh command what our default repo is
export GH_REPO=github.com/elastic/kibana

FTR_ENABLE_FIPS_AGENT=false
if [[ "${KBN_ENABLE_FIPS:-}" == "true" ]] || is_pr_with_label "ci:enable-fips-agent"; then
  FTR_ENABLE_FIPS_AGENT=true
  ES_SECURITY_ENABLED=true
  export ES_SECURITY_ENABLED
  # used by FIPS agents to link FIPS OpenSSL modules
  export OPENSSL_MODULES=$HOME/openssl/lib/ossl-modules

  if [[ -f "$KIBANA_DIR/config/node.options" ]]; then
    echo -e '\n--enable-fips' >>"$KIBANA_DIR/config/node.options"
    echo "--openssl-config=$HOME/nodejs.cnf" >>"$KIBANA_DIR/config/node.options"
  fi

  if [[ -f "$KIBANA_DIR/config/kibana.yml" ]]; then
    echo -e '\nxpack.security.experimental.fipsMode.enabled: true' >>"$KIBANA_DIR/config/kibana.yml"
  fi
fi

export FTR_ENABLE_FIPS_AGENT

export ES_SNAPSHOT_MANIFEST="https://storage.googleapis.com/kibana-ci-es-snapshots-daily/9.0.0/archives/20240911-172219_4ce661cc/manifest.json"