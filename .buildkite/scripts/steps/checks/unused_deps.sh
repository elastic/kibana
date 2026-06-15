#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check for unused dependencies
node scripts/knip --workspace . --include dependencies,devDependencies
