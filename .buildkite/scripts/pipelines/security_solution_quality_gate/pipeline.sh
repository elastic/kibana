#!/bin/bash

set -euo pipefail

echo "In the entrypoint for the quality gate"
ts-node .buildkite/scripts/pipelines/security_solution_quality_gate/pipeline.ts