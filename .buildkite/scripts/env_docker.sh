#!/usr/bin/env bash

set -euo pipefail

export CI=true
export HOME=/var/lib/kibana

export KIBANA_DIR="$HOME/workspace/kibana"
export XPACK_DIR="$HOME/workspace/kibana/x-pack"

export CACHE_DIR="$HOME/.cache"
export PARENT_DIR="$HOME/workspace"
export WORKSPACE="$HOME/workspace"

# TODO change to ARG?
export KIBANA_PKG_BRANCH=master
export KIBANA_BASE_BRANCH=naster

export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export RE2_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

export NODE_OPTIONS="--max-old-space-size=4096"

export FORCE_COLOR=1
export TEST_BROWSER_HEADLESS=1

export ELASTIC_APM_ENVIRONMENT=ci
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1

export ELASTIC_APM_ACTIVE=false
export CHECKS_REPORTER_ACTIVE=false

export FLEET_PACKAGE_REGISTRY_PORT=6104
export TEST_CORS_SERVER_PORT=6105

export DETECT_CHROMEDRIVER_VERSION=true
export CHROMEDRIVER_FORCE_DOWNLOAD=true

export GCS_UPLOAD_PREFIX=asihdauishd98u42589

# TODO
export NODE_VERSION=14.16.0

export KIBANA_BUILD_LOCATION="$WORKSPACE/kibana-build-xpack"
