#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

# Broken during Node 18 upgrade
export NODE_OPTIONS="--openssl-legacy-provider"
ts-node .buildkite/scripts/steps/storybooks/build_and_upload.ts
