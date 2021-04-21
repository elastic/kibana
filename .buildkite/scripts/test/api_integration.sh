#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo '--- API Integration Tests'
node scripts/functional_tests \
  --config test/api_integration/config.js \
  --bail \
  --debug
