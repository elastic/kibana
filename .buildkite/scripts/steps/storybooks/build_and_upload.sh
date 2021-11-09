#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

node .buildkite/scripts/steps/storybooks/build_and_upload.js
