#!/usr/bin/env bash

set -euo pipefail

ts-node .buildkite/scripts/steps/version_bump/pipeline.ts | buildkite-agent pipeline upload

