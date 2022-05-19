#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

JOB=${BUILDKITE_PARALLEL_JOB:-0}

echo '--- Jest'
checks-reporter-with-killswitch "Jest Unit Tests $((JOB+1))" \
  .buildkite/scripts/steps/test/jest_parallel.sh jest.config.js
