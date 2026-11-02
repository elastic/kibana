#!/usr/bin/env bash

set -euo pipefail

# cancel.ts only depends on Node, .buildkite/node_modules, #pipeline-utils, and the
# buildkite-agent CLI. A full repo bootstrap is unnecessary and can fail if
# cache steps haven't finished yet.
node "$(dirname "${0}")/cancel.ts"
