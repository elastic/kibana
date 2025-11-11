#!/bin/bash

set -euo pipefail

set +e
ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts 1>&2
set -e

ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts
