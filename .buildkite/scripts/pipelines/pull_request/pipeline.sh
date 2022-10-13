#!/bin/bash

set -euo pipefail

ts-node .buildkite/scripts/pipelines/pull_request/pipeline.ts
