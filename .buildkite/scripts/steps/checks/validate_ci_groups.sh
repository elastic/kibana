#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Ensure that all tests are in a CI Group
node scripts/ensure_all_tests_in_ci_group
