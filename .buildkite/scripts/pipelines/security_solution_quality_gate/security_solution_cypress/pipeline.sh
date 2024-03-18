#!/bin/bash

set -euo pipefail

ts-node .buildkite/scripts/pipelines/security_solution_quality_gate/security_solution_cypress/pipeline.ts
