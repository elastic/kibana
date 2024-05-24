#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

tsx .buildkite/scripts/lifecycle/ci_stats_ready.ts
