#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

ts-node --transpile-only .buildkite/scripts/steps/scout_vrt/run_pr_vrt_compare.ts
