#!/usr/bin/env bash

set -euo pipefail

export CI=true
export HOME="/var/lib/buildkite-agent"

export KIBANA_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
export XPACK_DIR="$KIBANA_DIR/x-pack"

export CACHE_DIR="$HOME/.kibana"
export PARENT_DIR="$(cd "$KIBANA_DIR/.."; pwd)"
export WORKSPACE="${WORKSPACE:-$PARENT_DIR}"

export KIBANA_PKG_BRANCH="$(jq -r .branch "$KIBANA_DIR/package.json")"
export KIBANA_BASE_BRANCH="$KIBANA_PKG_BRANCH"

export GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export RE2_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
export CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"

export FORCE_COLOR=1
export TEST_BROWSER_HEADLESS=1

export ELASTIC_APM_ENVIRONMENT=ci
export ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1

export ELASTIC_APM_ACTIVE=false
export CHECKS_REPORTER_ACTIVE=false

export FLEET_PACKAGE_REGISTRY_PORT=6104 # Any unused port is fine, used by ingest manager tests
export TEST_CORS_SERVER_PORT=6105 # Any unused port is fine, used by ingest manager tests

if [[ "$(which google-chrome-stable)" || "$(which google-chrome)" ]]; then
  echo "Chrome detected, setting DETECT_CHROMEDRIVER_VERSION=true"
  export DETECT_CHROMEDRIVER_VERSION=true
  export CHROMEDRIVER_FORCE_DOWNLOAD=true
else
  echo "Chrome not detected, installing default chromedriver binary for the package version"
fi

export GCS_UPLOAD_PREFIX=iahsuidhaoshjdlkajhsoifjhasi

################

echo "### Setup Node"

export NODE_VERSION="$(cat "$KIBANA_DIR/.node-version")"
export NODE_DIR="$CACHE_DIR/node/$NODE_VERSION"
export NODE_BIN_DIR="$NODE_DIR/bin"
export YARN_OFFLINE_CACHE="$CACHE_DIR/yarn-offline-cache"

if [[ ! -d "$NODE_DIR" ]]; then
  nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz"

  echo "node.js v$NODE_VERSION not found at $NODE_DIR, downloading from $nodeUrl"

  mkdir -p "$NODE_DIR"
  curl --silent -L "$nodeUrl" | tar -xz -C "$NODE_DIR" --strip-components=1
else
  echo "node.js v$NODE_VERSION already installed to $NODE_DIR, re-using"
  ls -alh "$NODE_BIN_DIR"
fi

export PATH="$NODE_BIN_DIR:$PATH"

echo "### Setup Yarn"

export YARN_VERSION="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"

if [[ ! $(which yarn) || $(yarn --version) != "$YARN_VERSION" ]]; then
  npm install -g "yarn@^${YARN_VERSION}"
fi

yarn config set yarn-offline-mirror "$YARN_OFFLINE_CACHE"

export YARN_GLOBAL_BIN="$(yarn global bin)"
export PATH="$PATH:$YARN_GLOBAL_BIN"

#################

echo "### Bootstrap"

echo "##### yarn install and kbn bootstrap"
yarn kbn bootstrap

echo "##### build kbn-pm"
yarn kbn run build -i @kbn/pm

echo "##### build plugin list docs"
node scripts/build_plugin_list_docs

#######################

echo " -> building kibana platform plugins"
node scripts/build_kibana_platform_plugins \
  --scan-dir "$KIBANA_DIR/test/plugin_functional/plugins" \
  --scan-dir "$KIBANA_DIR/test/common/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_functional/plugins" \
  --scan-dir "$XPACK_DIR/test/functional_with_es_ssl/fixtures/plugins" \
  --scan-dir "$XPACK_DIR/test/alerting_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_integration/plugins" \
  --scan-dir "$XPACK_DIR/test/plugin_api_perf/plugins" \
  --scan-dir "$XPACK_DIR/test/licensing_plugin/plugins" \
  --scan-dir "$XPACK_DIR/test/usage_collection/plugins" \
  --verbose

export KBN_NP_PLUGINS_BUILT=true

echo " -> building and extracting default Kibana distributable for use in functional tests"
cd "$KIBANA_DIR"
node scripts/build --debug --no-oss

linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
export KIBANA_INSTALL_DIR="$PARENT_DIR/install/kibana"
mkdir -p "$KIBANA_INSTALL_DIR"
tar -xzf "$linuxBuild" -C "$KIBANA_INSTALL_DIR" --strip=1

export JOB=kibana-default-ciGroup${CI_GROUP}

cd "$XPACK_DIR"

node scripts/functional_tests \
  --debug --bail \
  --kibana-install-dir "$KIBANA_INSTALL_DIR" \
  --include-tag "ciGroup$CI_GROUP"
