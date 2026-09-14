#!/bin/bash
set -euo pipefail

node .buildkite/pipelines/fips/fips_pipeline.ts
