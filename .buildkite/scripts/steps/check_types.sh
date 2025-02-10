#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
export MOON_LOG_FILE=moon.log
moon ci @kbn/health-gateway-server:typecheck @kbn/discover-plugin:typecheck -c 1 -- --verbose

#moon ci :typecheck -c 3
