#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

ts-node .buildkite/scripts/lifecycle/ci_stats_ready.ts
