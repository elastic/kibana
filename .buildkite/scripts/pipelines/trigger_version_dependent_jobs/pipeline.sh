#!/bin/bash

set -euo pipefail

ts-node .buildkite/scripts/pipelines/trigger_version_dependent_jobs/pipeline.ts
