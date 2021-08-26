#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Test Projects
checks-reporter-with-killswitch "Test Projects" \
  yarn kbn run test --exclude kibana --oss --skip-kibana-plugins --skip-missing
