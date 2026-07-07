#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Build API Docs"
node --max-old-space-size=24000 scripts/build_api_docs
