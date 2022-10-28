#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check TypeScript Projects
node scripts/check_ts_projects
