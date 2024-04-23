#!/usr/bin/env bash

set -euo pipefail

node .buildkite/pipelines/flaky_tests/pipeline.js
