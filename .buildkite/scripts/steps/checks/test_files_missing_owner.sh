#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check for Test Files missing an owner
node scripts/check_test_code_owners
