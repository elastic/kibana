#!/bin/bash

set -euo pipefail

node .buildkite/scripts/pipelines/trigger_version_dependent_jobs/pipeline.ts
