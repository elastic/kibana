#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Code Generation

(cd x-pack/plugins/security_solution && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true