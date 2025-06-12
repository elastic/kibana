#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh
# Some Storybooks depend on Kibana React plugin
.buildkite/scripts/download_build_artifacts.sh

ts-node .buildkite/scripts/steps/storybooks/build_and_upload.ts
