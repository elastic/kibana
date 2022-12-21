#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

ts-node .buildkite/pipelines/flaky_tests/pipeline.ts | buildkite-agent pipeline upload
