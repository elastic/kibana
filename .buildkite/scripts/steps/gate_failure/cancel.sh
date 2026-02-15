#!/usr/bin/env bash

set -euo pipefail

# cancel.ts only depends on .buildkite/node_modules (ts-node, #pipeline-utils,
# buildkite-agent CLI). A full repo bootstrap is unnecessary and can fail if
# cache steps haven't finished yet.
echo '--- Cancel steps on gate failure'
.buildkite/node_modules/.bin/ts-node "$(dirname "${0}")/cancel.ts"
