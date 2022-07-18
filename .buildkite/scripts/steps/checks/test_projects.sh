#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Test Projects
checks-reporter-with-killswitch "Test Projects" \
  yarn kbn run-in-packages test
