#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=true

.buildkite/scripts/bootstrap.sh

echo --- Building api docs
node --max-old-space-size=12000 scripts/build_api_docs
