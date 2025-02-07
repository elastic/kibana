#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo --- Check Types
moon ci @kbn/health-gateway-server:typecheck @kbn/discover-plugin:typecheck -c 1 --log trace

#moon ci :typecheck -c 3
