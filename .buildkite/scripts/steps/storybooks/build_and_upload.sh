#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

tsx .buildkite/scripts/steps/storybooks/build_and_upload.ts
