#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Buildkite Typecheck

npm run typecheck --prefix .buildkite
