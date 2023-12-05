#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Fleet OpenAPI Code Generation

(cd x-pack/plugins/fleet && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true