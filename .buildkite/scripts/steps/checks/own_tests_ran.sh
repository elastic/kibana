#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# TODO-TRE: Turn this back on
#echo --- Check Own Tests Ran
#checks-reporter-with-killswitch "Check Own Tests Ran" \
#  node scripts/check_own_tests_ran.js

node scripts/check_own_tests_ran.js
