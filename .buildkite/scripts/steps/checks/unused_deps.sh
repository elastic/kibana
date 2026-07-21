#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

node scripts/knip --include dependencies,devDependencies
