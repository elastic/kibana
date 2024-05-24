#!/bin/bash

set -euo pipefail

tsx .buildkite/scripts/pipelines/pull_request/pipeline.ts
