#!/usr/bin/env bash

set -euo pipefail

BUILD_FAILED=$(buildkite-agent meta-data get build_failed --default "false")
export BUILD_FAILED

node "$(dirname "${0}")/ci_stats_complete.js"
