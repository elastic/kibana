#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

ts-node .buildkite/scripts/steps/storybooks/build_and_upload.ts
