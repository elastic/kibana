#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=true
export API_DOCS_BUILD_MODE=full

.buildkite/scripts/steps/api_docs/build_api_docs.sh
