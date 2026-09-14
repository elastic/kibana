#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Formatting with oxfmt
node scripts/oxfmt --check
