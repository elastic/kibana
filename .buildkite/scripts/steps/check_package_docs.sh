#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

echo "--- Check Package Docs"
node --max-old-space-size=24000 scripts/check_package_docs
