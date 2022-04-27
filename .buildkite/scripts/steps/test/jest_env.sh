#!/usr/bin/env bash

set -euo pipefail

# keys used to associate test group data in ci-stats with Jest execution order
export TEST_GROUP_TYPE_UNIT="Jest Unit Tests"
export TEST_GROUP_TYPE_INTEGRATION="Jest Integration Tests"
