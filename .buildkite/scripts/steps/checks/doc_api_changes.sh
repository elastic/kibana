#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Doc API Changes
node scripts/check_published_api_changes
