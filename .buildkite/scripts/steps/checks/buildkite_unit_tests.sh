#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Buildkite Unit Tests
# Standalone .buildkite npm workspace; deps installed by pre_command → setup_buildkite_deps.sh
npm test --prefix .buildkite
