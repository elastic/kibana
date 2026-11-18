#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

if should_enable_fips; then
  export NODE_OPTIONS="${NODE_OPTIONS:-} --enable-fips --openssl-config=$HOME/nodejs.cnf"
fi

# Runs every package migrated off Jest; the Jest steps no longer pick them up. On CI the root
# vitest.config.ts also writes target/junit/TEST-Vitest.xml for the post-command failure report.
echo '--- Vitest'
node scripts/vitest
