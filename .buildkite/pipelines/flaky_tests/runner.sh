#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

node .buildkite/scripts/steps/flaky_test_suite_runner.js | buildkite-agent pipeline upload
