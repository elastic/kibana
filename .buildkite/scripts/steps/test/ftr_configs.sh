#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB="$FTR_CONFIG_GROUP_KEY"

node ./scripts/functional_tests \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config=test/functional/apps/kibana_overview/config.ts
