#!/bin/bash

set -euo pipefail

# Entry point for the `kibana-static-checks` pipeline, triggered by its checkbox in the PR comment.
# Uploads only the static validation steps, without building Kibana or running test suites.
node .buildkite/scripts/pipelines/static_checks/pipeline.ts
