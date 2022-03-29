#!/usr/bin/env bash

set -euo pipefail

export BUILD_TS_REFS_DISABLE=false

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"
node --max-old-space-size=12000 scripts/build_api_docs
