#!/usr/bin/env bash

set -euo pipefail

node .buildkite/scripts/steps/version_bump/pipeline.ts | buildkite-agent pipeline upload
