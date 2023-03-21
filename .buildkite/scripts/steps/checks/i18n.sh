#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check i18n
node scripts/i18n_check --ignore-missing
