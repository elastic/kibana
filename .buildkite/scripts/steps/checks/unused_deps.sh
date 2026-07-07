#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# shellcheck disable=SC2317
node scripts/knip --include dependencies,devDependencies
