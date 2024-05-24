#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

tsx .buildkite/pipelines/flaky_tests/pipeline.ts
