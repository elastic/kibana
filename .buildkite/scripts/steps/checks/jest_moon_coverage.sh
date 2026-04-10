#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Verify Jest Configs in Moon Projects
node scripts/verify_jest_moon_coverage
