#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB_NUM=$((BUILDKITE_PARALLEL_JOB+1))
export JOB=ftr-configs-${JOB_NUM}

config=$(sed "${JOB_NUM}q;d" .buildkite/ftr_configs)

echo "--- $ node scripts/functional_tests --bail --config $config"
node ./scripts/functional_tests \
  --bail \
  --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
  --config="$config"
