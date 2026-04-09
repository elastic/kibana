#!/usr/bin/env bash

set -euo pipefail

# TODO: If the logic is simple within the piplein.ts file, then remove that layer of abstraction.
ts-node .buildkite/scripts/steps/version_bump/pipeline.ts | buildkite-agent pipeline upload

