#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Building api docs
node --max-old-space-size=12000 scripts/build_api_docs
