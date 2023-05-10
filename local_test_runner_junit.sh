#!/usr/bin/env bash

set -euo pipefail

echo "--- Test and Report (junit)"
# Dont bootstrap, dont install nodejs v20, and dont upload
.buildkite/scripts/steps/nodejs_std_test_runner/junit_reporter.sh -b false -i false -r true -u false
