#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Production Native Node Modules
node scripts/check_prod_native_modules
