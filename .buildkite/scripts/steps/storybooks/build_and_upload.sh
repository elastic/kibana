#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

# Broken during Node 18 upgrade
# https://github.com/storybookjs/storybook/issues/20482
export NODE_OPTIONS="--openssl-legacy-provider"
ts-node .buildkite/scripts/steps/storybooks/build_and_upload.ts
