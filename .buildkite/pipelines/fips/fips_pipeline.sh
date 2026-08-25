#!/bin/bash
set -euo pipefail

ts-node .buildkite/pipelines/fips/fips_pipeline.ts
