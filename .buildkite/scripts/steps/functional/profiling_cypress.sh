#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/copy_es_snapshot_cache.sh

export JOB=kibana-profiling-cypress

echo "--- Profiling Cypress Tests"

pushd "$XPACK_DIR"

if ! NODE_OPTIONS=--openssl-legacy-provider node solutions/observability/plugins/profiling/scripts/test/e2e.js \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" ; then
  # Report the error to the team using the subfolder matching the Slack Team
  popd
  mkdir "$REPORT_SLACK_TEAM"
  touch "$REPORT_SLACK_TEAM"/obs-ux-infra_services-team.slack
  exit 1
fi
