#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Test Projects
pnpm kbn run-in-packages test
